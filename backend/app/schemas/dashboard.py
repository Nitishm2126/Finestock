from pydantic import BaseModel

class DashboardSummary(BaseModel):
    total_products: int
    active_products: int
    total_warehouses: int
    total_locations: int
    total_stock_units: float
    low_stock_products: int
    out_of_stock_products: int
