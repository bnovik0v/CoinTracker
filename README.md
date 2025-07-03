# CoinTracker

CoinTracker is a comprehensive cryptocurrency tracking and analysis platform. It leverages real-time social media data to provide insights into market sentiment and token performance. The application also features a trading simulation to test strategies based on the collected data.

## Features

- **Real-time Tweet Analysis**: Tracks and analyzes tweets related to various cryptocurrencies to gauge market sentiment.
- **Token Performance Tracking**: Provides detailed information and sentiment scores for different tokens.
- **Trading Simulation**: Allows users to simulate trading strategies based on sentiment analysis and market data.
- **RESTful API**: A powerful and easy-to-use API to access the collected data and trading simulation.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository:**

   ```sh
   git clone https://github.com/bnovik0v/CoinTracker.git
   cd CoinTracker
   ```

2. **Set up your environment variables:**

   Create a `.env` file by copying the example file:

   ```sh
   cp .env.example .env
   ```

   Update the `.env` file with your database credentials and any other required API keys.

3. **Build and run the application with Docker Compose:**

   ```sh
   docker-compose up --build
   ```

   The application will be available at [http://localhost:8000](http://localhost:8000).

## API Endpoints

The application provides a RESTful API for accessing data and a user-friendly web interface for visualization and interaction.

### Frontend

The web interface is served directly from the application:

- `GET /`: The main dashboard, providing an overview of token performance and sentiment.
- `GET /trading`: The trading simulation page, showing open and closed positions and overall performance.

### Backend API

The API is documented using Swagger UI, which is available at `/docs` when the application is running.

### Tokens

- `GET /tokens/top`: Get the top N tokens by sentiment score.
- `GET /tokens/{coin_name}/info`: Get aggregated information about a specific token.
- `GET /tokens/{coin_name}/tweets`: Get the latest tweets for a specific token.
- `GET /tokens/{coin_name}/sentiment/hourly`: Get hourly sentiment data for a specific token.

### Trades

- `GET /trades`: Get a list of all trades from the simulation.

## Web Interface

The CoinTracker dashboard provides a real-time view of the cryptocurrency market based on social media sentiment.

### Dashboard (`/`)

- **Top Tokens**: View a list of top-performing tokens based on sentiment scores over various time frames (1h, 3h, 6h, 12h, 24h).
- **Token Lookup**: Search for any cryptocurrency to get detailed analytics.
- **Detailed Analytics**: For each token, you can view:
  - **Hourly Sentiment Chart**: A 24-hour trend of market sentiment.
  - **Token Information**: Aggregated scores and mention counts.
  - **Top Keywords**: Words most frequently associated with the token in recent discussions.
  - **Recent Mentions**: A feed of the latest relevant tweets.

### Trading Simulation (`/trading`)

- **Performance Overview**: Track the overall profit and loss of your simulated trades for the last hour and the last 24 hours.
- **Deal Management**: View lists of your open and closed trading positions.

## Project Structure

```bash
├── alembic/              # Alembic migration scripts
├── app/                  # Main application source code
│   ├── collectors/       # Data collection scripts
│   ├── llm/              # Language model integration
│   ├── static/           # Static files (CSS, JS, images)
│   ├── templates/        # HTML templates
│   ├── __init__.py
│   ├── crud.py           # CRUD operations for the database
│   ├── database.py       # Database session management
│   ├── main.py           # FastAPI application entry point
│   ├── models.py         # SQLAlchemy models
│   ├── routes.py         # API route definitions
│   ├── scheduler.py      # Background task scheduler
│   ├── schemas.py        # Pydantic schemas
│   ├── settings.py       # Application settings
│   ├── trading_simulation.py # Trading simulation logic
│   └── tweet_analysis.py # Tweet sentiment analysis
├── .env                  # Environment variables
├── .gitignore
├── Dockerfile
├── alembic.ini           # Alembic configuration
├── docker-compose.yml    # Docker Compose configuration
├── poetry.lock
├── pyproject.toml        # Python project configuration (Poetry)
└── README.md
```

## Built With

- [FastAPI](https://fastapi.tiangolo.com/) - The web framework used
- [SQLAlchemy](https://www.sqlalchemy.org/) - The SQL toolkit and Object Relational Mapper
- [Alembic](https://alembic.sqlalchemy.org/) - Database migrations tool
- [Poetry](https://python-poetry.org/) - Dependency management
- [Docker](https://www.docker.com/) - Containerization
