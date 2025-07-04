import uuid
import enum
from sqlalchemy import Column, String, DateTime, Text, Enum, Index, case, Float
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import and_
from app.database import Base


class SentimentEnum(enum.Enum):
    """Enumerates allowed sentiment classes."""
    positive = "positive"
    negative = "negative"
    neutral = "neutral"


class CoinTweetAnalysis(Base):
    """Stores the NLP sentiment analysis of a tweet mentioning a coin."""

    __tablename__ = "coin_tweet_analysis"

    id = Column(PGUUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    
    twitter_id = Column(String(255), nullable=False, index=True, unique=True)

    # frequently‑filtered columns
    coin_name = Column(String(255), nullable=False, index=True)
    publish_date = Column(DateTime(timezone=True), nullable=False, index=True)

    # model outputs
    sentiment = Column(Enum(SentimentEnum, name="sentiment_enum"), nullable=False, index=True)
    keywords = Column(ARRAY(String), nullable=False)  # list[str]
    text = Column(Text, nullable=False)
    author = Column(String(255), nullable=True)

    # audit metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # composite index optimised for (coin_name, publish_date) look‑ups
    __table_args__ = (
        Index("ix_coin_date", "coin_name", "publish_date"),
    )

    @hybrid_property
    def weight(self) -> int:
        """Returns a numeric weight based on sentiment: positive=1, negative=-1, neutral=0."""
        # python-side for in-memory objects
        match self.sentiment:
            case SentimentEnum.positive:
                return 1
            case SentimentEnum.negative:
                return -1
            case _:
                return 0

    @weight.expression
    def weight(cls):
        """SQL expression for the weight property used inside queries."""
        return case(
            (cls.sentiment == SentimentEnum.positive, 1),
            (cls.sentiment == SentimentEnum.negative, -1),
            else_=0,
        )

    @classmethod
    def sentiment_by_bucket(
        cls, session, *, start, end, coin=None, bucket="hour"
    ):
        """
        Get sentiment aggregation by time bucket for a specific coin or all coins.
        
        Args:
            session: SQLAlchemy session
            start: Start datetime for the query range
            end: End datetime for the query range
            coin: Optional coin name to filter by
            bucket: Time bucket size ('minute', 'hour', 'day', 'week', 'month')
            
        Returns:
            List of tuples with (coin_name, bucket, n_tweets, score)
        """
        from sqlalchemy import select, func
        
        stmt = (
            select(
                cls.coin_name,
                func.date_trunc(bucket, cls.publish_date).label("bucket"),
                func.count().label("n_tweets"),
                func.sum(cls.weight).label("score"),
                (func.sum(cls.weight) / func.count()).label("avg_score"),
            )
            .where(cls.publish_date.between(start, end))
            .group_by(cls.coin_name, "bucket")
            .order_by("bucket")
        )
        
        if coin:
            stmt = stmt.where(cls.coin_name == coin)
            
        return session.execute(stmt).all()
    
    def __repr__(self) -> str:  # pragma: no cover – convenience only
        return (
            f"<CoinTweetAnalysis id={self.id} coin='{self.coin_name}' "
            f"sentiment='{self.sentiment.value}' publish_date='{self.publish_date:%Y-%m-%d}'>"
        )


class Trade(Base):
    """Stores a trade."""
    __tablename__ = "trades"
    
    id = Column(PGUUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    coin_name = Column(String(255), nullable=False, index=True)
    buy_price = Column(Float, nullable=False)
    sell_price = Column(Float, nullable=True)
    buy_date = Column(DateTime(timezone=True), nullable=False)
    sell_date = Column(DateTime(timezone=True), nullable=True)

    @hybrid_property
    def profit(self):
        if self.sell_price is not None:
            return self.sell_price - self.buy_price
        return None

    @profit.expression
    def profit(cls):
        return case(
            (cls.sell_price.isnot(None), cls.sell_price - cls.buy_price),
            else_=None
        )
    
    @hybrid_property
    def profit_percent(self):
        if self.sell_price is not None and self.buy_price != 0:
            return ((self.sell_price - self.buy_price) / self.buy_price) * 100
        return None

    @profit_percent.expression
    def profit_percent(cls):
        return case(
            (
                and_(cls.sell_price.isnot(None), cls.buy_price != 0),
                ((cls.sell_price - cls.buy_price) / cls.buy_price) * 100,
            ),
            else_=None,
        )
    
    __table_args__ = (
        Index("ix_trade_coin_date", "coin_name", "buy_date"),
    )
    
    def __repr__(self) -> str:  # pragma: no cover – convenience only
        return (
            f"<Trade id={self.id} coin='{self.coin_name}' "
            f"buy_price='{self.buy_price}' sell_price='{self.sell_price}' "
            f"buy_date='{self.buy_date:%Y-%m-%d}' sell_date='{self.sell_date:%Y-%m-%d}'>"
        )
