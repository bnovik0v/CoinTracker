"""ScrapeStorm API client to fetch data from Twitter"""

import logging
from typing import Dict, Any, Literal
import requests
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential
from app.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


TIMEOUT = 60


class ScrapeStormAPIClient:
    """ScrapeStorm API client"""

    def __init__(
        self,
        base_url: str = settings.scrapestorm_base_url,
        token: str = settings.scrapestorm_api_key,
    ):
        self.base_url = base_url
        self.token = token

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    def search_tweets_by_query(
        self, query: str, tag: Literal["top", "latest"] = "latest", cursor: str | None = None
    ) -> Dict[str, Any]:
        """Search tweets by query
        
        Args:
            query: Search query string
            tag: Type of tweets to fetch ('top' or 'latest')
            cursor: Pagination cursor for fetching next page of results
            
        Returns:
            Dict containing status, pagination info and tweet data
        """
        url = f"{self.base_url}/twitter.com/api/v2.1/search_tweets_by_query/"
        params = {"token": self.token, "query": query, "tag": tag}
        if cursor:
            params["cursor"] = cursor
            
        try:
            response = requests.get(url, params=params, timeout=TIMEOUT)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching tweets by query: {e}")
            raise
    
    def search_tweets(self, query: str, tag: Literal["top", "latest"] = "latest", num_pages: int = 1):
        """Search tweets by query"""
        tweets = []
        cursor = None
        for _ in range(num_pages):
            response = self.search_tweets_by_query(query, tag, cursor)
            tweets.extend(response["data"]["entries"])
            cursor = response["pagination"]["next_cursor"]
        return tweets

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def search_tweets_by_query_async(
        self, query: str, tag: Literal["top", "latest"] = "latest", cursor: str | None = None
    ) -> Dict[str, Any]:
        """Async version of search_tweets_by_query method
        
        Args:
            query: Search query string
            tag: Type of tweets to fetch ('top' or 'latest')
            cursor: Pagination cursor for fetching next page of results
            
        Returns:
            Dict containing status, pagination info and tweet data
        """
        url = f"{self.base_url}/twitter.com/api/v2.1/search_tweets_by_query/"
        params = {"token": self.token, "query": query, "tag": tag}
        if cursor:
            params["cursor"] = cursor
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=TIMEOUT) as response:
                    response.raise_for_status()
                    return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"Error searching tweets by query: {e}")
            raise
    
    async def search_tweets_async(self, query: str, tag: Literal["top", "latest"] = "latest", num_pages: int = 1):
        tweets = []
        cursor = None
        for _ in range(num_pages):
            response = await self.search_tweets_by_query_async(query, tag, cursor)
            tweets.extend(response["data"]["entries"])
            cursor = response["pagination"]["next_cursor"]
        return tweets


    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    def search_google_news(
        self, query: str, date_range: Literal["anytime", "1h", "1d", "7d", "1y"] = "anytime", has_words: str | None = None, exclude_words: str | None = None, website: str | None = None
    ) -> Dict[str, Any]:
        """Search Google News by query
        
        Args:
            query: Search query string
            date_range: Recency of news results
            has_words: Words that must appear
            exclude_words: Words to exclude
            website: Limit results to specific website
            
        Returns:
            Dict containing status, pagination info and news article data
        """
        url = f"{self.base_url}/google.com/api/v2.1/search_google_news/"
        params = {"token": self.token, "query": query, "date_range": date_range}
        if has_words:
            params["has_words"] = has_words
        if exclude_words:
            params["exclude_words"] = exclude_words
        if website:
            params["website"] = website
            
        try:
            response = requests.get(url, params=params, timeout=TIMEOUT)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching Google News: {e}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def search_google_news_async(
        self, query: str, date_range: Literal["anytime", "1h", "1d", "7d", "1y"] = "anytime", has_words: str | None = None, exclude_words: str | None = None, website: str | None = None
    ) -> Dict[str, Any]:
        """Async version of search_google_news method"""
        url = f"{self.base_url}/google.com/api/v2.1/search_google_news/"
        params = {"token": self.token, "query": query, "date_range": date_range}
        if has_words:
            params["has_words"] = has_words
        if exclude_words:
            params["exclude_words"] = exclude_words
        if website:
            params["website"] = website
            
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=TIMEOUT) as response:
                    response.raise_for_status()
                    return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"Error searching Google News: {e}")
            raise