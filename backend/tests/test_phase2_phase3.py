import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.core.security import hash_password
from app.models.user import User
from app.models.organization import Organization
from app.models.role import Role
from app.models.category import Category
from app.models.uom import UOM
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.location import Location
from app.models.stock_position import StockPosition
from app.models.stock_ledger_entry import StockLedgerEntry

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(scope="module")
def setup_data():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    org_id = uuid.uuid4()
    org = Organization(id=org_id, name="Phase2 Org", slug="phase2-org")
    db.add(org)

    role_id = uuid.uuid4()
    role = Role(id=role_id, name="ADMIN", description="Admin Role")
    db.add(role)

    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        organization_id=org_id,
        role_id=role_id,
        email="ops@finestock.com",
        password_hash=hash_password("password123"),
        first_name="Ops",
        last_name="Manager",
        is_active=True,
    )
    db.add(user)

    cat_id = uuid.uuid4()
    cat = Category(id=cat_id, organization_id=org_id, name="Electronics")
    db.add(cat)

    uom_id = uuid.uuid4()
    uom = UOM(id=uom_id, organization_id=org_id, name="Pieces", code="PCS")
    db.add(uom)

    prod_id = uuid.uuid4()
    product = Product(
        id=prod_id,
        organization_id=org_id,
        category_id=cat_id,
        uom_id=uom_id,
        sku="SKU-KEYBOARD",
        name="Mechanical Keyboard",
        reorder_point=10,
        reorder_quantity=25,
    )
    db.add(product)

    wh1_id = uuid.uuid4()
    wh1 = Warehouse(id=wh1_id, organization_id=org_id, name="Main WH", code="MWH1")
    db.add(wh1)

    loc1_id = uuid.uuid4()
    loc1 = Location(id=loc1_id, warehouse_id=wh1_id, name="Rack A1", code="LOC-A1")
    db.add(loc1)

    wh2_id = uuid.uuid4()
    wh2 = Warehouse(id=wh2_id, organization_id=org_id, name="Secondary WH", code="SWH2")
    db.add(wh2)

    loc2_id = uuid.uuid4()
    loc2 = Location(id=loc2_id, warehouse_id=wh2_id, name="Bin B1", code="LOC-B1")
    db.add(loc2)

    db.commit()

    yield {
        "org_id": org_id,
        "user_id": user_id,
        "product_id": prod_id,
        "wh1_id": wh1_id,
        "loc1_id": loc1_id,
        "wh2_id": wh2_id,
        "loc2_id": loc2_id,
    }

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def get_token():
    client = TestClient(app)
    res = client.post("/api/auth/login", json={"email": "ops@finestock.com", "password": "password123"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_supplier_and_receipt_lifecycle(setup_data):
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Supplier
    s_res = client.post(
        "/api/suppliers/",
        json={
            "name": "Global Tech Suppliers",
            "code": "SUP-GT01",
            "email": "contact@globaltech.com",
            "lead_time_days": 5,
        },
        headers=headers,
    )
    assert s_res.status_code == 201
    supplier_id = s_res.json()["id"]

    # 2. Create Receipt (status WAITING, stock should NOT increase yet)
    r_res = client.post(
        "/api/receipts/",
        json={
            "supplier_id": supplier_id,
            "warehouse_id": str(setup_data["wh1_id"]),
            "destination_location_id": str(setup_data["loc1_id"]),
            "expected_date": "2026-10-01T10:00:00Z",
            "lines": [
                {
                    "product_id": str(setup_data["product_id"]),
                    "expected_quantity": 50.0,
                }
            ],
        },
        headers=headers,
    )
    assert r_res.status_code == 201
    receipt_data = r_res.json()
    receipt_id = receipt_data["id"]
    assert receipt_data["status"] == "WAITING"

    # Verify inventory is still 0 before validation
    inv_res = client.get("/api/inventory/", headers=headers)
    assert inv_res.status_code == 200
    positions = inv_res.json()["positions"]
    assert len(positions) == 0

    # 3. Validate Receipt
    val_res = client.post(f"/api/receipts/{receipt_id}/validate", headers=headers)
    assert val_res.status_code == 200
    assert val_res.json()["status"] == "DONE"

    # Verify inventory has now increased to 50
    inv_res2 = client.get("/api/inventory/", headers=headers)
    pos2 = inv_res2.json()["positions"]
    assert len(pos2) == 1
    assert float(pos2[0]["quantity"]) == 50.0
    assert float(pos2[0]["available_quantity"]) == 50.0

    # Verify immutable ledger entry
    mov_res = client.get("/api/movements/", headers=headers)
    assert mov_res.status_code == 200
    movements = mov_res.json()["movements"]
    assert len(movements) == 1
    assert movements[0]["transaction_type"] == "RECEIPT_IN"
    assert float(movements[0]["quantity_delta"]) == 50.0


def test_delivery_order_lifecycle(setup_data):
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create Delivery Order for 20 units
    d_res = client.post(
        "/api/deliveries/",
        json={
            "customer_name": "Acme Corp",
            "warehouse_id": str(setup_data["wh1_id"]),
            "source_location_id": str(setup_data["loc1_id"]),
            "priority": "HIGH",
            "lines": [
                {
                    "product_id": str(setup_data["product_id"]),
                    "requested_quantity": 20.0,
                }
            ],
        },
        headers=headers,
    )
    assert d_res.status_code == 201
    delivery_id = d_res.json()["id"]

    # Reserve Delivery (Physical: 50, Reserved: 20, Available: 30)
    res_res = client.post(f"/api/deliveries/{delivery_id}/reserve", headers=headers)
    assert res_res.status_code == 200

    inv_res = client.get("/api/inventory/", headers=headers)
    pos = inv_res.json()["positions"][0]
    assert float(pos["quantity"]) == 50.0
    assert float(pos["reserved_quantity"]) == 20.0
    assert float(pos["available_quantity"]) == 30.0

    # Pick and Pack
    pick_res = client.post(f"/api/deliveries/{delivery_id}/pick", headers=headers)
    assert pick_res.status_code == 200
    assert pick_res.json()["status"] == "PICKED"

    pack_res = client.post(f"/api/deliveries/{delivery_id}/pack", headers=headers)
    assert pack_res.status_code == 200
    assert pack_res.json()["status"] == "READY"

    # Complete Delivery (Physical becomes 30, Reserved becomes 0, Available becomes 30)
    del_res = client.post(f"/api/deliveries/{delivery_id}/deliver", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "DELIVERED"

    inv_res2 = client.get("/api/inventory/", headers=headers)
    pos2 = inv_res2.json()["positions"][0]
    assert float(pos2["quantity"]) == 30.0
    assert float(pos2["reserved_quantity"]) == 0.0
    assert float(pos2["available_quantity"]) == 30.0


def test_internal_transfer(setup_data):
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Transfer 10 units from Loc1 (WH1) to Loc2 (WH2)
    t_res = client.post(
        "/api/transfers/",
        json={
            "source_warehouse_id": str(setup_data["wh1_id"]),
            "source_location_id": str(setup_data["loc1_id"]),
            "destination_warehouse_id": str(setup_data["wh2_id"]),
            "destination_location_id": str(setup_data["loc2_id"]),
            "reason": "Rebalance stock",
            "lines": [
                {
                    "product_id": str(setup_data["product_id"]),
                    "quantity": 10.0,
                }
            ],
        },
        headers=headers,
    )
    assert t_res.status_code == 201
    transfer_id = t_res.json()["id"]

    # Execute transfer
    exec_res = client.post(f"/api/transfers/{transfer_id}/execute", headers=headers)
    assert exec_res.status_code == 200
    assert exec_res.json()["status"] == "DONE"

    # Verify stock: Loc1 should have 20, Loc2 should have 10. Total remains 30!
    inv = client.get("/api/inventory/", headers=headers).json()["positions"]
    total_qty = sum(float(p["quantity"]) for p in inv)
    assert total_qty == 30.0


def test_stock_adjustment(setup_data):
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Physical count found 22 in Loc1 instead of 20 (Found stock +2)
    adj_res = client.post(
        "/api/adjustments/",
        json={
            "warehouse_id": str(setup_data["wh1_id"]),
            "location_id": str(setup_data["loc1_id"]),
            "product_id": str(setup_data["product_id"]),
            "physical_count": 22.0,
            "reason": "FOUND_STOCK",
            "notes": "Found extra box during cycle count",
        },
        headers=headers,
    )
    assert adj_res.status_code == 201
    adj_id = adj_res.json()["id"]

    # Approve adjustment
    appr_res = client.post(f"/api/adjustments/{adj_id}/approve", headers=headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"
    assert float(appr_res.json()["difference"]) == 2.0


def test_insufficient_stock_error(setup_data):
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Try to deliver 9999 units when only 22 exist
    d_res = client.post(
        "/api/deliveries/",
        json={
            "customer_name": "Large Order Corp",
            "warehouse_id": str(setup_data["wh1_id"]),
            "source_location_id": str(setup_data["loc1_id"]),
            "lines": [
                {
                    "product_id": str(setup_data["product_id"]),
                    "requested_quantity": 9999.0,
                }
            ],
        },
        headers=headers,
    )
    assert d_res.status_code == 201
    delivery_id = d_res.json()["id"]

    res_res = client.post(f"/api/deliveries/{delivery_id}/reserve", headers=headers)
    assert res_res.status_code == 400
    err_body = res_res.json()
    assert err_body["success"] is False
    assert err_body["error"]["code"] == "INSUFFICIENT_STOCK"
