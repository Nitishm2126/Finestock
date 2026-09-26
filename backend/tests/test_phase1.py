import pytest
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

import uuid

# Setup an in-memory SQLite database for testing
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
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create Organization
    org_id = uuid.uuid4()
    org = Organization(id=org_id, name="Test Org", slug="test-org")
    db.add(org)
    
    # Create Role
    role_id = uuid.uuid4()
    role = Role(id=role_id, name="ADMIN", description="Admin Role")
    db.add(role)
    
    db.commit()

    # Create User
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        organization_id=org_id,
        role_id=role_id,
        email="admin@test.com",
        password_hash=hash_password("testpassword123"),
        first_name="Admin",
        last_name="User",
        is_active=True,
    )
    db.add(user)
    db.commit()
    
    yield
    
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

def test_login(setup_database):
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "testpassword123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    return response.json()["access_token"]

def test_create_category(setup_database):
    token = test_login(setup_database)
    response = client.post(
        "/api/categories/",
        json={"name": "Electronics", "description": "Electronic items"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Electronics"

def test_create_uom(setup_database):
    token = test_login(setup_database)
    response = client.post(
        "/api/uoms/",
        json={"name": "Pieces", "code": "PCS", "description": "Count"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    assert response.json()["code"] == "PCS"

def test_create_warehouse(setup_database):
    token = test_login(setup_database)
    response = client.post(
        "/api/warehouses/",
        json={"name": "Main Warehouse", "code": "WH1", "address": "123 Main St"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    assert response.json()["code"] == "WH1"
