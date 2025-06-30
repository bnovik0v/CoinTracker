from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, timezone
from . import crud, schemas
from .database import get_session

router = APIRouter()

@router.get("/tokens/top", response_model=List[schemas.TokenScore])
def get_top_tokens(
    limit: int = Query(10, ge=1, le=100),
    time_range: str = Query("day", regex="^(hour|3hr|6hr|12hr|day)$"),
    db: Session = Depends(get_session),
):
    """
    Get top N tokens by sentiment score for the specified time range (hour, 3hr, 6hr, 12hr, day).
    """
    tokens = crud.get_tokens_by_score(db, time_range=time_range, limit=limit)
    return tokens

@router.get("/tokens/{coin_name}/info", response_model=schemas.TokenAggregateInfo)
def get_token_info(
    coin_name: str,
    time_range: str = Query("day", regex="^(hour|3hr|6hr|12hr|day)$"),
    db: Session = Depends(get_session),
):
    """
    Get aggregated information about a token for the specified time range (hour, 3hr, 6hr, 12hr, day).
    """
    token_info = crud.get_token_aggregate_info(db, coin_name=coin_name, time_range=time_range)
    if token_info is None:
        raise HTTPException(status_code=404, detail="Token not found or no mentions in the selected time range")
    return token_info

@router.get("/tokens/{coin_name}/tweets", response_model=List[schemas.Tweet])
def get_latest_tweets(
    coin_name: str,
    skip: int = 0,
    limit: int = 5,
    db: Session = Depends(get_session),
):
    """
    Get the most recent tweets for a given token, with pagination support.
    """
    tweets = crud.get_latest_tweets_by_coin(
        db, coin_name=coin_name, skip=skip, limit=limit
    )
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

    now = datetime.now(timezone.utc)
    start_of_hour = now.replace(minute=0, second=0, microsecond=0)
    
    # Generate all hours for the last 24 hours
    all_hours = [start_of_hour - timedelta(hours=i) for i in range(24)]
    
    # Create a dictionary for quick lookups
    sentiment_map = {
        item.hour: item for item in sentiment_data
    }
    
    # Create the full list, filling in missing data
    full_sentiment_data = []
    for hour in all_hours:
        if hour in sentiment_map:
            item = sentiment_map[hour]
            full_sentiment_data.append(schemas.HourlySentiment.model_validate(item))
        else:
            full_sentiment_data.append(schemas.HourlySentiment(
                hour=hour,
                avg_sentiment=0.0,
                n_tweets=0,
            ))
            
    # Sort by hour ascending
    full_sentiment_data.sort(key=lambda x: x.hour)

    return full_sentiment_data

@router.get("/trades", response_model=List[schemas.Trade])
def get_trades(
    is_closed: bool | None = Query(None),
    time_range: str = Query("day", regex="^(hour|3hr|6hr|12hr|day)$"),
    limit: int = Query(10, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_session),
):
    """
    Get all trades.
    """
    return crud.get_trades(db, limit=limit, skip=skip, is_closed=is_closed, time_range=time_range)
