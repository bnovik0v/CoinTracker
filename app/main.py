import logging
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from . import crud
from .database import get_session
from .routes import router as api_router
from .settings import get_settings

# Configure logging before importing settings
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


logger.info("Loading settings...")
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup event logic here
    logger.info("Application is starting...")
    yield
    # Shutdown event logic here
    logger.info("Application is shutting down...")

app = FastAPI(
    title="CoinTracker",
    description="CoinTracker API",
    version=settings.api_version,
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")

app.include_router(api_router, prefix="/api")

@app.get("/", tags=["frontend"])
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/trading", response_class=HTMLResponse, tags=["frontend"])
async def trading(request: Request, db: Session = Depends(get_session)):
    """Serves the trading simulation page with overall profit data."""
    profit_data_day = crud.get_overall_profit(db, time_range="day")
    profit_data_hour = crud.get_overall_profit(db, time_range="hour")
    return templates.TemplateResponse(
        "trading_simulation.html",
        {
            "request": request,
            "profit_data_day": profit_data_day,
            "profit_data_hour": profit_data_hour,
        },
    )

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint for Docker and load balancers."""
    return {"status": "healthy", "version": settings.api_version}

@app.get("/ready", tags=["health"])
async def readiness_check():
    """Readiness check endpoint to verify database connectivity."""
    try:
        # Test database connection
        from app.database import get_session
        with get_session() as session:
            session.execute("SELECT 1")
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not ready")
