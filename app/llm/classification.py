from langchain_openai import ChatOpenAI

from pydantic import BaseModel, Field
from typing import Literal
from tenacity import retry, stop_after_attempt, wait_exponential


class CoinTweetAnalysis(BaseModel):
    """CoinTweetAnalysis model."""

    is_speculative_coin: bool = Field(description="Is the coin a speculative coin?")
    coin_name: str = Field(description="The name of the coin")
    sentiment: Literal["positive", "negative", "neutral"] = Field(
        description="The sentiment of the tweet"
    )
    keywords: list[str] = Field(description="2-3 keywords from the tweet")


model = ChatOpenAI(
    model="gpt-4.1-mini",
    temperature=0,
)
model_with_structured_output = model.with_structured_output(CoinTweetAnalysis)

PROMPT = """
You are a crypto-savvy analyst.  
Given **one tweet** about crypto, extract structured information and return it **exactly** in the JSON schema shown below.

# ➊ Identify whether a **specific cryptocurrency** is mentioned  
• Look only for explicit tickers (`$PEPE`, `PEPE/USDT`, `#PEPE`) **or** well-known coin names (Bitcoin, Solana, XRP, etc.).  
• Ignore generic words like “shitcoin” when no concrete ticker follows.  
• If no specific coin is found, leave `coin_name` an empty string and set `is_speculative_coin` to **false**.

# ➋ Determine the most important coin (`coin_name`)  
• If several $-tickers appear, choose the one that appears **earliest** in the tweet.  
• Return only the **uppercase** ticker (strip `$`, `#`, or pair suffixes like `/USDT`).

# ➌ Classify `is_speculative_coin` (boolean)  
Set **true** if the selected coin falls in any of these categories:  
1. **Memecoin** by reputation (DOGE, PEPE, SHIB, FLOKI, BONK, BART, MOOP, etc.).  
2. **Shitcoin** (the tweet explicitly calls the coin a “shitcoin” or similar slur).  
3. **Altcoin**—i.e., any smaller-cap or mid-cap crypto that is **not** among the top blue chips (BTC or ETH).  
A hashtag like `#memecoin` alone is **not** enough; decide based on the coin itself.  
If no coin or the coin is BTC/ETH (or another blue-chip) → `is_speculative_coin: false`.

# ➍ Sentiment (`positive` | `negative` | `neutral`)  
• Use overall tone.  
• Sarcasm: if the surface text is praise but includes cues like “yeah right”, “LMAO”, treat as **negative**.

# ➎ Keywords  
• Provide **2–3** concise nouns or noun-phrases that describe the coin’s context (e.g., “pump”, “creator rewards”, “airdrop”).  
• **Do not include** generic trading boiler-plate: vip, tp, signal, invest, join, trading, forex, pumpfun, pump, TP5/TP10, giveaways, “join telegram”, etc.

# ➏ Output  
Return **only** the following JSON object (no extra keys, no commentary; booleans in lowercase):

```json
{
  "is_speculative_coin": true | false,
  "coin_name": "TICKER" | "",
  "sentiment": "positive" | "negative" | "neutral",
  "keywords": ["kw1", "kw2", "kw3"]
}
````

# 📌 Example

**Input tweet**

> I'm seeing a lot of hype around \$DOGE lately, is it still a good buy?

**Expected JSON**

```json
{
  "is_speculative_coin": true,
  "coin_name": "DOGE",
  "sentiment": "neutral",
  "keywords": ["hype", "buy"]
}
```

---

### Now analyze this tweet:

```
{tweet}
```
"""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
)
async def classify_tweet(tweet: str) -> CoinTweetAnalysis:
    """Classify a tweet."""
    analysis = model_with_structured_output.invoke(PROMPT.replace("{tweet}", tweet))
    return analysis
