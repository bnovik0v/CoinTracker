from collections import Counter

from sqlalchemy.orm import Session
from sqlalchemy import func, case, select
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

    results = (
        db.query(
            models.CoinTweetAnalysis.coin_name,
            func.sum(models.CoinTweetAnalysis.weight).label("score"),
        )
        .filter(models.CoinTweetAnalysis.publish_date >= start_time)
        .group_by(models.CoinTweetAnalysis.coin_name)
        .order_by(func.sum(models.CoinTweetAnalysis.weight).desc())
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
                    (models.CoinTweetAnalysis.sentiment == models.SentimentEnum.positive, 1),
                    else_=0,
                )
            ).label("positive_count"),
            func.sum(
                case(
                    (models.CoinTweetAnalysis.sentiment == models.SentimentEnum.negative, 1),
                    else_=0,
                )
            ).label("negative_count"),
            func.sum(
                case(
                    (models.CoinTweetAnalysis.sentiment == models.SentimentEnum.neutral, 1),
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

def get_latest_tweets_by_coin(db: Session, coin_name: str, limit: int = 5):
    """
    Get the latest N tweets for a given coin.
    """
    return (
        db.query(models.CoinTweetAnalysis)
        .filter(models.CoinTweetAnalysis.coin_name == coin_name)
        .order_by(models.CoinTweetAnalysis.publish_date.desc())
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
            func.date_trunc('hour', models.CoinTweetAnalysis.publish_date).label('hour'),
            func.count().label('n_tweets'),
            func.avg(models.CoinTweetAnalysis.weight).label('avg_sentiment'),
            func.sum(models.CoinTweetAnalysis.weight).label('sentiment_score')
        )
        .filter(models.CoinTweetAnalysis.coin_name == coin_name)
        .filter(models.CoinTweetAnalysis.publish_date >= start_time)
        .group_by('hour')
        .order_by('hour')
        .all()
    )


def aggregate_sentiment(
    db: Session,
    *,
    coins: Optional[List[str]] = None,
    start: datetime,
    end: datetime,
    bucket: str = "hour",       # 'minute' · 'hour' · 'day' · 'week' · 'month' …
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
            func.date_trunc(bucket, models.CoinTweetAnalysis.publish_date).label("bucket"),
            func.count().label("n_tweets"),
            func.sum(models.CoinTweetAnalysis.weight).label("score"),
            (func.sum(models.CoinTweetAnalysis.weight) / func.count()).label("avg_score"),
        )
        .where(models.CoinTweetAnalysis.publish_date.between(start, end))
        .group_by(models.CoinTweetAnalysis.coin_name, "bucket")
        .order_by("bucket")
    )

    if coins:
        stmt = stmt.where(models.CoinTweetAnalysis.coin_name.in_(coins))

    return db.execute(stmt).all()
