from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from . import crud, schemas
from .database import get_session

router = APIRouter()

@router.get("/tokens/top", response_model=List[schemas.TokenScore])
def get_top_tokens(
    limit: int = Query(10, ge=1, le=100),
    time_range: str = Query("day", regex="^(hour|day)$"),
    db: Session = Depends(get_session),
):
    """
    Get top N tokens by sentiment score for the last hour or day.
    """
    tokens = crud.get_tokens_by_score(db, time_range=time_range, limit=limit)
    return tokens

@router.get("/tokens/{coin_name}/info", response_model=schemas.TokenAggregateInfo)
def get_token_info(
    coin_name: str,
    time_range: str = Query("day", regex="^(hour|day)$"),
    db: Session = Depends(get_session),
):
    """
    Get aggregated information about a token for the last hour or day.
    """
    token_info = crud.get_token_aggregate_info(db, coin_name=coin_name, time_range=time_range)
    if token_info is None:
        raise HTTPException(status_code=404, detail="Token not found or no mentions in the selected time range")
    return token_info

@router.get("/tokens/{coin_name}/tweets", response_model=List[schemas.Tweet])
def get_latest_tweets(
    coin_name: str,
    db: Session = Depends(get_session),
):
    """
    Get the 5 most recent tweets for a given token.
    """
    tweets = crud.get_latest_tweets_by_coin(db, coin_name=coin_name, limit=5)
    return tweets

@router.get("/tokens/{coin_name}/sentiment/hourly", response_model=List[schemas.HourlySentiment])
def get_hourly_sentiment(
    coin_name: str,
    db: Session = Depends(get_session),
):
    """
    Get hourly sentiment data for a given token for the last 24 hours.
    """
    sentiment_data = crud.get_hourly_sentiment_by_coin(db, coin_name=coin_name)
    return sentiment_data
