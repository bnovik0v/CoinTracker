from collections import Counter

from sqlalchemy.orm import Session
from sqlalchemy import func, case, Float, select
from . import models
from datetime import datetime, timedelta, timezone
from typing import List, Optional


def get_tokens_by_score(db: Session, time_range: str, limit: int):
    """
    Get N tokens for the specified time range sorted by sentiment score.
    """
    if time_range == "hour":
        start_time = datetime.now(timezone.utc) - timedelta(hours=1)
    elif time_range == "3hr":
        start_time = datetime.now(timezone.utc) - timedelta(hours=3)
    elif time_range == "6hr":
        start_time = datetime.now(timezone.utc) - timedelta(hours=6)
    elif time_range == "12hr":
        start_time = datetime.now(timezone.utc) - timedelta(hours=12)
    elif time_range == "day":
        start_time = datetime.now(timezone.utc) - timedelta(days=1)
    else:
        return []

    score = (
        func.sum(models.CoinTweetAnalysis.weight)
        * (
            func.count(func.distinct(models.CoinTweetAnalysis.author)).cast(Float)
            / func.count(models.CoinTweetAnalysis.id)
        )
    ).label("score")

    results = (
        db.query(
            models.CoinTweetAnalysis.coin_name,
            score,
        )
        .filter(models.CoinTweetAnalysis.publish_date >= start_time)
        .group_by(models.CoinTweetAnalysis.coin_name)
        .order_by(score.desc())
        .limit(limit)
        .all()
    )
    return results


def get_token_aggregate_info(db: Session, coin_name: str, time_range: str):
    """
    Get aggregated info about a token for the specified time range.
    """
    if time_range == "hour":
        start_time = datetime.now(timezone.utc) - timedelta(hours=1)
    elif time_range == "3hr":
        start_time = datetime.now(timezone.utc) - timedelta(hours=3)
    elif time_range == "6hr":
        start_time = datetime.now(timezone.utc) - timedelta(hours=6)
    elif time_range == "12hr":
        start_time = datetime.now(timezone.utc) - timedelta(hours=12)
    elif time_range == "day":
        start_time = datetime.now(timezone.utc) - timedelta(days=1)
    else:
        return None

    results = (
        db.query(
            func.count(models.CoinTweetAnalysis.id).label("total_mentions"),
            func.sum(
                case(
                    (
                        models.CoinTweetAnalysis.sentiment
                        == models.SentimentEnum.positive,
                        1,
                    ),
                    else_=0,
                )
            ).label("positive_count"),
            func.sum(
                case(
                    (
                        models.CoinTweetAnalysis.sentiment
                        == models.SentimentEnum.negative,
                        1,
                    ),
                    else_=0,
                )
            ).label("negative_count"),
            func.sum(
                case(
                    (
                        models.CoinTweetAnalysis.sentiment
                        == models.SentimentEnum.neutral,
                        1,
                    ),
                    else_=0,
                )
            ).label("neutral_count"),
            func.sum(models.CoinTweetAnalysis.weight).label("sentiment_score"),
        )
        .filter(models.CoinTweetAnalysis.coin_name == coin_name)
        .filter(models.CoinTweetAnalysis.publish_date >= start_time)
        .first()
    )

    if not results or not results.total_mentions:
        return None

    # get top keywords
    keywords_results = (
        db.query(models.CoinTweetAnalysis.keywords)
        .filter(models.CoinTweetAnalysis.coin_name == coin_name)
        .filter(models.CoinTweetAnalysis.publish_date >= start_time)
        .all()
    )

    all_keywords = [keyword for row in keywords_results for keyword in row.keywords]
    keyword_counts = Counter(all_keywords)
    top_keywords = [
        {"keyword": keyword, "count": count}
        for keyword, count in keyword_counts.most_common(10)
    ]

    positive_count = results.positive_count or 0
    negative_count = results.negative_count or 0
    total_mentions = results.total_mentions or 0
    sentiment_score = results.sentiment_score or 0

    if total_mentions > 0:
        average_sentiment_score = sentiment_score / total_mentions
    else:
        average_sentiment_score = 0

    return {
        "coin_name": coin_name,
        "positive_mentions": positive_count,
        "negative_mentions": negative_count,
        "neutral_mentions": results.neutral_count or 0,
        "total_mentions": total_mentions,
        "sentiment_score": sentiment_score,
        "average_sentiment_score": average_sentiment_score,
        "top_keywords": top_keywords,
    }


def get_latest_tweets_by_coin(
    db: Session, coin_name: str, skip: int = 0, limit: int = 5
):
    """
    Get the latest N tweets for a given coin.
    """
    return (
        db.query(models.CoinTweetAnalysis)
        .filter(models.CoinTweetAnalysis.coin_name == coin_name)
        .order_by(models.CoinTweetAnalysis.publish_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_hourly_sentiment_by_coin(db: Session, coin_name: str):
    """
    Get the average sentiment for a coin for the last 24 hours, grouped by hour.
    """
    start_time = datetime.now(timezone.utc) - timedelta(days=1)

    return (
        db.query(
            func.date_trunc("hour", models.CoinTweetAnalysis.publish_date).label(
                "hour"
            ),
            func.count().label("n_tweets"),
            func.avg(models.CoinTweetAnalysis.weight).label("avg_sentiment"),
            func.sum(models.CoinTweetAnalysis.weight).label("sentiment_score"),
        )
        .filter(models.CoinTweetAnalysis.coin_name == coin_name)
        .filter(models.CoinTweetAnalysis.publish_date >= start_time)
        .group_by("hour")
        .order_by("hour")
        .all()
    )


def aggregate_sentiment(
    db: Session,
    *,
    coins: Optional[List[str]] = None,
    start: datetime,
    end: datetime,
    bucket: str = "hour",  # 'minute' · 'hour' · 'day' · 'week' · 'month' …
):
    """
    Aggregate sentiment data for specified coins within a time range, bucketed by time period.

    Args:
        db: Database session
        coins: Optional list of coin names to filter by
        start: Start datetime for the query range
        end: End datetime for the query range
        bucket: Time bucket size ('minute', 'hour', 'day', 'week', 'month')

    Returns:
        List of tuples with (coin_name, bucket, n_tweets, score, avg_score)
    """
    stmt = (
        select(
            models.CoinTweetAnalysis.coin_name,
            func.date_trunc(bucket, models.CoinTweetAnalysis.publish_date).label(
                "bucket"
            ),
            func.count().label("n_tweets"),
            func.sum(models.CoinTweetAnalysis.weight).label("score"),
            (func.sum(models.CoinTweetAnalysis.weight) / func.count()).label(
                "avg_score"
            ),
        )
        .where(models.CoinTweetAnalysis.publish_date.between(start, end))
        .group_by(models.CoinTweetAnalysis.coin_name, "bucket")
        .order_by("bucket")
    )

    if coins:
        stmt = stmt.where(models.CoinTweetAnalysis.coin_name.in_(coins))

    return db.execute(stmt).all()


def get_overall_profit(db: Session, investment_per_trade: float = 10.0, time_range: str = "day"):
    """Calculate the overall profit from all closed trades."""
    closed_trades = (
        db.query(models.Trade).filter(models.Trade.sell_date.isnot(None))
    )
    
    if time_range == "hour":
        closed_trades = closed_trades.filter(models.Trade.sell_date >= datetime.now(timezone.utc) - timedelta(hours=1))
    elif time_range == "3hr":
        closed_trades = closed_trades.filter(models.Trade.sell_date >= datetime.now(timezone.utc) - timedelta(hours=3))
    elif time_range == "6hr":
        closed_trades = closed_trades.filter(models.Trade.sell_date >= datetime.now(timezone.utc) - timedelta(hours=6))
    elif time_range == "12hr":
        closed_trades = closed_trades.filter(models.Trade.sell_date >= datetime.now(timezone.utc) - timedelta(hours=12))
    elif time_range == "day":
        closed_trades = closed_trades.filter(models.Trade.sell_date >= datetime.now(timezone.utc) - timedelta(days=1))

    closed_trades = closed_trades.all()

    total_profit = 0
    total_investment = 0

    for trade in closed_trades:
        if trade.buy_price > 0:
            # Calculate the number of coins bought for the given investment
            coins_bought = (investment_per_trade / trade.buy_price) if trade.buy_price > 0 else 0
            # Calculate the profit for this trade
            profit = (trade.sell_price - trade.buy_price) * coins_bought
            total_profit += profit
            total_investment += investment_per_trade

    if total_investment == 0:
        return {"total_profit": 0, "profit_percentage": 0, "total_investment": 0}

    profit_percentage = (total_profit / total_investment) * 100

    return {
        "total_profit": total_profit,
        "profit_percentage": profit_percentage,
        "total_investment": total_investment,
    }


def get_open_trades(db: Session):
    """Get all open trades."""
    return db.query(models.Trade).filter(models.Trade.sell_date.is_(None)).all()


def get_trades(
    db: Session, limit: int = 10, skip: int = 0, is_closed: bool | None = None, time_range: str = "day"
):
    """Get all trades."""
    query = db.query(models.Trade)
    if is_closed is True:
        # For closed trades, sell_date should not be NULL
        query = query.filter(models.Trade.sell_date.isnot(None))
    elif is_closed is False:
        # For open trades, sell_date should be NULL
        query = query.filter(models.Trade.sell_date.is_(None))
    
    if time_range == "hour":
        query = query.filter(models.Trade.buy_date >= datetime.now(timezone.utc) - timedelta(hours=1))
    elif time_range == "3hr":
        query = query.filter(models.Trade.buy_date >= datetime.now(timezone.utc) - timedelta(hours=3))
    elif time_range == "6hr":
        query = query.filter(models.Trade.buy_date >= datetime.now(timezone.utc) - timedelta(hours=6))
    elif time_range == "12hr":
        query = query.filter(models.Trade.buy_date >= datetime.now(timezone.utc) - timedelta(hours=12))
    elif time_range == "day":
        query = query.filter(models.Trade.buy_date >= datetime.now(timezone.utc) - timedelta(days=1))
    
    # Sort by buy_date desc
    query = query.order_by(models.Trade.buy_date.desc())
    return query.offset(skip).limit(limit).all()