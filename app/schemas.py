from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
import uuid
from typing import List, Optional
from .models import SentimentEnum


class CoinTweetAnalysisBase(BaseModel):
    coin_name: str
    publish_date: datetime
    sentiment: SentimentEnum
    keywords: List[str]
    text: str

class CoinTweetAnalysisCreate(CoinTweetAnalysisBase):
    pass

class CoinTweetAnalysis(CoinTweetAnalysisBase):
    id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TokenScore(BaseModel):
    coin_name: str
    score: float

class KeywordCount(BaseModel):
    keyword: str
    count: int


class TokenAggregateInfo(BaseModel):
    coin_name: str
    total_mentions: int
    positive_mentions: int
    negative_mentions: int
    neutral_mentions: int
    average_sentiment_score: float
    top_keywords: Optional[List[KeywordCount]] = None


class Tweet(BaseModel):
    text: str
    publish_date: datetime
    sentiment: SentimentEnum
    weight: float
    author: str | None
    twitter_id: str | None


class HourlySentiment(BaseModel):
    hour: datetime
    average_sentiment_score: float = Field(..., alias='avg_sentiment')
    mentions: int = Field(..., alias='n_tweets')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Trade(BaseModel):
    coin_name: str
    buy_date: datetime
    sell_date: datetime | None
    buy_price: float
    sell_price: float
    