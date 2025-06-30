from datetime import datetime, timedelta
from app.crud import get_tokens_by_score, get_open_trades
from app.database import get_db
from app.models import Trade
import time
import logging
import requests
from typing import List
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def get_token_prices(tokens: List[str], vs_currency: str = "usd") -> dict:
    """
    Fetch prices for a list of tokens from CoinGecko API. Handles batches of up to 50 tokens.
    """
    BASE_URL = "https://api.coingecko.com/api/v3/simple/price"
    BATCH_SIZE = 50
    all_prices = {}

    # De-duplicate tokens and lowercase them
    tokens = list(set(token.lower() for token in tokens))

    for i in range(0, len(tokens), BATCH_SIZE):
        batch = tokens[i : i + BATCH_SIZE]
        params = {"vs_currencies": vs_currency, "symbols": ",".join(batch)}

        try:
            response = requests.get(BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            all_prices.update(data)
        except Exception as e:
            logging.error(f"Error fetching batch {i // BATCH_SIZE + 1}: {e}")

        # To respect API rate limits (optional, adjust as needed)
        time.sleep(1)  # sleep for 1 second between requests

    all_prices = {
        t.lower(): price_dict[vs_currency] for t, price_dict in all_prices.items()
    }
    return all_prices


async def main():
    """
    Main function for the trading simulation.
    """
    logging.info("Starting trading simulation...")
    return
    try:
        with get_db() as db:
            tokens = get_tokens_by_score(db, time_range="hour", limit=10)
            logging.info(f"Found {len(tokens)} tokens with score")

            monitored_tokens = get_open_trades(db)
            logging.info(f"Found {len(monitored_tokens)} monitored tokens")

            monitored_token_names = [t.coin_name.lower() for t in monitored_tokens]
            new_tokens = [
                t for t in tokens if t.coin_name.lower() not in monitored_token_names
            ]
            logging.info(f"Found {len(new_tokens)} new tokens")

            all_token_names = monitored_token_names + [
                t.coin_name.lower() for t in new_tokens
            ]

            if len(all_token_names) == 0:
                logging.info("No tokens to analyze. Exiting.")
                return

            all_token_prices_dict = get_token_prices(all_token_names)

            if len(all_token_prices_dict) == 0:
                logging.info("No tokens with price. Exiting.")
                return

            new_tokens = [
                t for t in new_tokens if t.coin_name.lower() in all_token_prices_dict
            ]
            logging.info(f"Found {len(new_tokens)} new tokens with price")

            to_close_trades = []
            for t in monitored_tokens:
                token_price = all_token_prices_dict[t.coin_name.lower()]
                if t.buy_date < datetime.now() - timedelta(hours=1):
                    to_close_trades.append(t)
                elif token_price < t.buy_price * 0.9 or token_price > t.buy_price * 1.1:
                    to_close_trades.append(t)

            logging.info(f"Found {len(to_close_trades)} trades to close")

            for t in to_close_trades:
                t.sell_date = datetime.now()
                t.sell_price = all_token_prices_dict[t.coin_name.lower()]
                db.add(t)

            logging.info(f"Found {len(new_tokens)} new tokens to open")

            for t in new_tokens:
                trade = Trade(
                    coin_name=t.coin_name.lower(),
                    buy_price=all_token_prices_dict[t.coin_name.lower()],
                    buy_date=datetime.now(),
                )
                db.add(trade)

            logging.info("Committing changes to the database...")
            db.commit()
    except Exception as e:
        logging.error(f"Error during trading simulation: {e}")
        db.rollback()
    finally:
        logging.info("Trading simulation finished.")


if __name__ == "__main__":
    asyncio.run(main())
