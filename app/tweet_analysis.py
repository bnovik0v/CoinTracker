import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Set

from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.collectors.scrapestorm.api_client import ScrapeStormAPIClient
from app.database import get_db as get_session
from app.llm.classification import classify_tweet
from app.models import CoinTweetAnalysis as DBCoinTweetAnalysis, SentimentEnum

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


SEARCH_KEYWORDS = [
    "meme AND (coin OR token OR airdrop) lang:en min_faves:5 -filter:quote",
    "new AND (coin OR token OR airdrop) lang:en min_faves:5 -filter:quote",
    "airdrop AND (coin OR token) lang:en min_faves:5 -filter:quote",
    "crypto AND (coin OR token OR airdrop) lang:en min_faves:5 -filter:quote",
    "scam AND (coin OR token) lang:en min_faves:5 -filter:quote",
    '("ape in" OR "pumping" OR "send it" OR "moon") "$" lang:en min_faves:5 -filter:retweets -filter:quote',
    '("should I buy" OR "worth buying" OR "next 100x") "$" lang:en min_faves:3 -filter:retweets -filter:quote',
]


class TwitterUser(BaseModel):
    created_at: datetime
    is_verified: bool
    is_blue_verified: bool
    followers_count: int
    friends_count: int
    statuses_count: int
    has_photo: bool
    has_banner: bool
    name: str | None

    @classmethod
    def from_scrapestorm_owner_record(cls, record: dict):
        return cls(
            created_at=datetime.fromisoformat(record["created_at"]),
            is_verified=record["verified"],
            is_blue_verified=record["is_blue_verified"],
            followers_count=record["followers_count"],
            friends_count=record["friends_count"],
            statuses_count=record["statuses_count"],
            has_photo="profile_image_url" in record,
            has_banner="profile_banner_url" in record,
            name=record["screen_name"],
        )

    @staticmethod
    def calculate_account_score(user: "TwitterUser"):
        score = 0.0

        age_days = (
            datetime.now(timezone.utc) - user.created_at.replace(tzinfo=timezone.utc)
        ).days

        if age_days < 7:
            score -= 5
        if age_days < 30:
            score -= 3
        elif age_days < 90:
            score -= 2
        elif age_days > 365:
            score += 1

        if user.is_verified:
            score += 10

        if user.is_blue_verified:
            score += 2

        if user.followers_count >= 500:
            score += 2
        elif user.followers_count >= 50:
            score += 1
        elif user.followers_count <= 10:
            score -= 1

        if user.friends_count == 0:
            score -= 1

        if user.followers_count == 0:
            score -= 1

        if user.friends_count > 0 and user.followers_count > 0:
            ratio = user.followers_count / user.friends_count
            if ratio < 0.2:
                score -= 1
            elif ratio > 5:
                score += 1

        if user.statuses_count >= 50:
            score += 1
        elif user.statuses_count <= 10:
            score -= 1

        if not user.has_photo:
            score -= 1

        if not user.has_banner:
            score -= 1

        return min(10, max(0, score))

    def is_spammer(self):
        return self.calculate_account_score(self) < 4


class Tweet(BaseModel):
    id: int
    text: str
    author: TwitterUser
    created_at: datetime
    views: int
    likes: int
    shares: int
    comments: int
    retweets: int
    has_attachment: bool

    @classmethod
    def from_scrapestorm_tweet(cls, tweet: dict):
        return cls(
            id=tweet["id"],
            text=tweet["description"],
            author=TwitterUser.from_scrapestorm_owner_record(tweet["owner"]),
            created_at=datetime.fromisoformat(tweet["created_at"]),
            views=tweet["view_count"],
            likes=tweet["liked_count"],
            shares=tweet["share_count"],
            comments=tweet["comment_count"],
            retweets=tweet["retweet_count"],
            has_attachment=len(tweet["contents"]) > 0,
        )

    def is_spam(self):
        return self.author.is_spammer()


def get_existing_tweet_ids(db: Session) -> Set[str]:
    """Retrieves all existing Twitter IDs from the database."""
    result = db.query(DBCoinTweetAnalysis.twitter_id).all()
    return {str(row[0]) for row in result}


async def fetch_and_filter_tweets(client: ScrapeStormAPIClient) -> List[Tweet]:
    """Fetches tweets from ScrapeStorm, converts them to Tweet models, and filters out spam and existing tweets."""
    logging.info(f"Searching for keywords: {SEARCH_KEYWORDS}")
    raw_results = []
    for keyword in SEARCH_KEYWORDS:
        try:
            found = await client.search_tweets_async(keyword, num_pages=1)
            raw_results.extend(found)
            logging.info(f"Found {len(found)} tweets for keyword '{keyword}'.")
        except Exception as e:
            logging.error(f"Failed to fetch tweets for keyword '{keyword}': {e}")

    logging.info(f"Total raw results fetched: {len(raw_results)}")

    unique_results = {res["id"]: res for res in raw_results}.values()
    tweets = [Tweet.from_scrapestorm_tweet(res) for res in unique_results]

    non_spam_tweets = [tweet for tweet in tweets if not tweet.is_spam()]
    logging.info(
        f"Filtered out spam. Remaining tweets for analysis: {len(non_spam_tweets)}"
    )

    # Filter out tweets that already exist in the database
    with get_session() as db:
        existing_tweet_ids = get_existing_tweet_ids(db)

    new_tweets = [
        tweet for tweet in non_spam_tweets if str(tweet.id) not in existing_tweet_ids
    ]
    logging.info(
        f"Filtered out {len(non_spam_tweets) - len(new_tweets)} existing tweets. New tweets for analysis: {len(new_tweets)}"
    )

    return new_tweets


def save_analyses_to_db(db: Session, analyses: List[dict]):
    """Saves a list of tweet analyses to the database, ignoring duplicates."""
    if not analyses:
        logging.info("No new analyses to save.")
        return

    stmt = insert(DBCoinTweetAnalysis).values(analyses)
    stmt = stmt.on_conflict_do_nothing(index_elements=["twitter_id"])

    try:
        result = db.execute(stmt)
        db.commit()
        logging.info(
            f"Successfully saved {result.rowcount} new tweet analyses to the database."
        )
    except Exception as e:
        logging.error(f"Database error: {e}")
        db.rollback()


async def main():
    """Main function to run the tweet analysis and save results."""
    client = ScrapeStormAPIClient()

    tweets_to_analyze = await fetch_and_filter_tweets(client)

    if not tweets_to_analyze:
        logging.info("No tweets to analyze. Exiting.")
        return

    results = []
    batch_size = 10
    for i in range(0, len(tweets_to_analyze), batch_size):
        batch = tweets_to_analyze[i : i + batch_size]
        tasks = [classify_tweet(tweet.text.replace("\n", " ")) for tweet in batch]
        logging.info(
            f"Analyzing batch {i//batch_size + 1}/{(len(tweets_to_analyze) + batch_size - 1)//batch_size} ({len(batch)} tweets)..."
        )

        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        results.extend(batch_results)

    db_payload = []
    for tweet, analysis_result in zip(tweets_to_analyze, results):
        if isinstance(analysis_result, Exception):
            logging.error(f"Analysis failed for tweet ID {tweet.id}: {analysis_result}")
            continue
        if (
            not analysis_result
            or not analysis_result.is_speculative_coin
            or not analysis_result.coin_name
        ):
            continue

        db_item = {
            "twitter_id": str(tweet.id),
            "coin_name": analysis_result.coin_name,
            "publish_date": tweet.created_at,
            "sentiment": SentimentEnum[analysis_result.sentiment],
            "keywords": analysis_result.keywords,
            "text": tweet.text,
            "author": tweet.author.name,
        }
        db_payload.append(db_item)

    logging.info(f"Prepared {len(db_payload)} analyses for database insertion.")

    with get_session() as db:
        save_analyses_to_db(db, db_payload)


if __name__ == "__main__":
    logging.info("Starting tweet analysis script.")
    asyncio.run(main())
    logging.info("Tweet analysis script finished.")
