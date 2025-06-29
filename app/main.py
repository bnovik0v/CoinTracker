import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.settings import get_settings
from app.routes import router as api_router

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
