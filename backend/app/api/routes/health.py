from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.schemas.health import HealthResponse
from app.core.database import check_database_connection

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health():
    """
    System health check verifying API operational status and database connectivity.
    """
    db_check = check_database_connection()
    is_db_connected = db_check.get("status") == "connected"

    response_data = HealthResponse(
        success=is_db_connected,
        message="Fine Stock API is running",
        database=db_check.get("status", "unknown"),
        services={
            "database": db_check.get("status", "unknown"),
        },
    )

    status_code = status.HTTP_200_OK if is_db_connected else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content=response_data.model_dump(),
    )
