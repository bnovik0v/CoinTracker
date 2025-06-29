import asyncio
import logging
import time

from app.tweet_analysis import main as run_tweet_analysis

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

async def main_loop():
    """Runs the tweet analysis script in a loop every 10 minutes."""
    while True:
        logging.info("Scheduler: Starting tweet analysis run...")
        try:
            await run_tweet_analysis()
            logging.info("Scheduler: Tweet analysis run finished successfully.")
        except Exception as e:
            logging.error(f"Scheduler: An error occurred during tweet analysis: {e}")
        
        logging.info("Scheduler: Waiting for 10 minutes before the next run...")
        time.sleep(600)  # 600 seconds = 10 minutes

if __name__ == "__main__":
    logging.info("Scheduler service started.")
    asyncio.run(main_loop())
