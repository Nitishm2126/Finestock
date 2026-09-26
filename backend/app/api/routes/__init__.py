from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.categories import router as categories_router
from app.api.routes.uoms import router as uoms_router
from app.api.routes.products import router as products_router
from app.api.routes.warehouses import router as warehouses_router
from app.api.routes.locations import router as locations_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.dashboard import router as dashboard_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(categories_router)
api_router.include_router(uoms_router)
api_router.include_router(products_router)
api_router.include_router(warehouses_router)
api_router.include_router(locations_router)
api_router.include_router(inventory_router)
api_router.include_router(dashboard_router)

__all__ = ["api_router"]
