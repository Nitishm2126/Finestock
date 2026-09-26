import uuid
import concurrent.futures
from decimal import Decimal
import pytest
from app.core.database import SessionLocal
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
from app.models.delivery import DeliveryOrder, DeliveryOrderLine
from app.services.delivery_service import DeliveryService, InsufficientStockException


@pytest.fixture(scope="module")
def setup_concurrency_env():
    db = SessionLocal()

    org_id = uuid.uuid4()
    org = Organization(id=org_id, name="Concurrency Test Org", slug=f"conc-org-{uuid.uuid4().hex[:6]}")
    db.add(org)

    role = db.query(Role).filter(Role.name == "ADMIN").first()
    if not role:
        role = Role(id=uuid.uuid4(), name="ADMIN", description="Admin")
        db.add(role)

    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        organization_id=org_id,
        role_id=role.id,
        email=f"tester-{uuid.uuid4().hex[:6]}@finestock.com",
        password_hash=hash_password("password123"),
        first_name="Concurrent",
        last_name="Tester",
        is_active=True,
    )
    db.add(user)

    cat = Category(id=uuid.uuid4(), organization_id=org_id, name=f"Hardware-{uuid.uuid4().hex[:4]}")
    db.add(cat)

    uom = db.query(UOM).filter(UOM.organization_id == org_id).first()
    if not uom:
        uom = UOM(id=uuid.uuid4(), organization_id=org_id, name="Pieces", code=f"PCS-{uuid.uuid4().hex[:4]}")
        db.add(uom)

    sku = f"CONC-{uuid.uuid4().hex[:6]}"
    product = Product(
        id=uuid.uuid4(),
        organization_id=org_id,
        category_id=cat.id,
        uom_id=uom.id,
        sku=sku,
        name="Ultra High-Speed Cable",
        reorder_point=5,
        reorder_quantity=20,
    )
    db.add(product)

    wh = Warehouse(id=uuid.uuid4(), organization_id=org_id, name="Central Hub", code=f"HUB-{uuid.uuid4().hex[:4]}")
    db.add(wh)

    loc = Location(id=uuid.uuid4(), warehouse_id=wh.id, name="Bin C-10", code=f"BIN-{uuid.uuid4().hex[:4]}")
    db.add(loc)

    # Initial stock: exactly 50.0 units
    pos = StockPosition(
        id=uuid.uuid4(),
        product_id=product.id,
        location_id=loc.id,
        quantity=Decimal("50.0000"),
        reserved_quantity=Decimal("0.0000"),
    )
    db.add(pos)

    # Pre-create 50 deliveries requesting 2 units each
    delivery_ids = []
    for i in range(50):
        deliv = DeliveryOrder(
            id=uuid.uuid4(),
            organization_id=org_id,
            delivery_number=f"DEL-{uuid.uuid4().hex[:8]}",
            customer_name=f"Customer {i + 1}",
            warehouse_id=wh.id,
            source_location_id=loc.id,
            status="WAITING",
            created_by=user_id,
            version=1,
        )
        db.add(deliv)
        line = DeliveryOrderLine(
            id=uuid.uuid4(),
            delivery_id=deliv.id,
            product_id=product.id,
            requested_quantity=Decimal("2.0000"),
            reserved_quantity=Decimal("0.0000"),
            picked_quantity=Decimal("0.0000"),
            packed_quantity=Decimal("0.0000"),
            delivered_quantity=Decimal("0.0000"),
            source_location_id=loc.id,
        )
        db.add(line)
        delivery_ids.append(deliv.id)

    db.commit()

    yield {
        "org_id": org_id,
        "user_id": user_id,
        "product_id": product.id,
        "wh_id": wh.id,
        "loc_id": loc.id,
        "delivery_ids": delivery_ids,
    }

    # Cleanup test org data
    clean_db = SessionLocal()
    clean_db.query(DeliveryOrderLine).filter(DeliveryOrderLine.delivery_id.in_(delivery_ids)).delete(synchronize_session=False)
    clean_db.query(DeliveryOrder).filter(DeliveryOrder.id.in_(delivery_ids)).delete(synchronize_session=False)
    clean_db.query(StockPosition).filter(StockPosition.product_id == product.id).delete()
    clean_db.query(Location).filter(Location.id == loc.id).delete()
    clean_db.query(Warehouse).filter(Warehouse.id == wh.id).delete()
    clean_db.query(Product).filter(Product.id == product.id).delete()
    clean_db.query(UOM).filter(UOM.id == uom.id).delete()
    clean_db.query(Category).filter(Category.id == cat.id).delete()
    clean_db.query(User).filter(User.id == user_id).delete()
    clean_db.query(Organization).filter(Organization.id == org_id).delete()
    clean_db.commit()
    clean_db.close()


def test_fifty_concurrent_pick_operations(setup_concurrency_env):
    """
    Mandatory prompt test on PostgreSQL:
    Initial available = 50 units.
    50 concurrent operations each requesting 2 units.
    Exactly 25 must succeed, remaining 25 must fail safely.
    Final available >= 0 (must be exactly 0).
    No negative stock or double allocation.
    """
    org_id = setup_concurrency_env["org_id"]
    user_id = setup_concurrency_env["user_id"]
    delivery_ids = setup_concurrency_env["delivery_ids"]

    # Each thread operates with its own DB connection to PostgreSQL
    def worker(delivery_id):
        session = SessionLocal()
        try:
            DeliveryService.reserve_delivery(session, org_id, user_id, delivery_id)
            return True, None
        except InsufficientStockException as e:
            return False, e.details
        except Exception as e:
            return False, str(e)
        finally:
            session.close()

    success_count = 0
    fail_count = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(worker, d_id) for d_id in delivery_ids]
        for f in concurrent.futures.as_completed(futures):
            ok, details = f.result()
            if ok:
                success_count += 1
            else:
                fail_count += 1

    assert success_count == 25, f"Expected 25 successes, got {success_count}"
    assert fail_count == 25, f"Expected 25 failures, got {fail_count}"

    # Verify inventory state: Available must be exactly 0, Reserved exactly 50, Physical 50
    verify_db = SessionLocal()
    pos = verify_db.query(StockPosition).filter(
        StockPosition.product_id == setup_concurrency_env["product_id"],
        StockPosition.location_id == setup_concurrency_env["loc_id"],
    ).first()

    physical = float(pos.quantity)
    reserved = float(pos.reserved_quantity)
    available = physical - reserved

    assert physical == 50.0
    assert reserved == 50.0
    assert available == 0.0
    assert available >= 0.0, "Available stock must never be negative!"
    verify_db.close()
