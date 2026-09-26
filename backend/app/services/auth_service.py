import re
import uuid
from typing import Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import UserRegisterRequest
from app.core.security import hash_password, verify_password, create_access_token


DEFAULT_ROLES = [
    ("ADMIN", "Full system administration and organization control"),
    ("INVENTORY_MANAGER", "Manages catalog, inventory, and stock transfers"),
    ("WAREHOUSE_SUPERVISOR", "Supervises warehouse floor, inbound, and outbound operations"),
    ("WAREHOUSE_STAFF", "Executes picking, packing, receiving, and counting"),
]


def ensure_default_roles(db: Session) -> None:
    """
    Ensures all baseline inventory roles exist in the database.
    """
    for role_name, description in DEFAULT_ROLES:
        existing = db.query(Role).filter(Role.name == role_name).first()
        if not existing:
            new_role = Role(
                id=uuid.uuid4(),
                name=role_name,
                description=description,
            )
            db.add(new_role)
    db.commit()


def generate_unique_slug(db: Session, name: str) -> str:
    """
    Generates a URL-safe, unique slug for an organization.
    """
    base_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not base_slug:
        base_slug = "org"

    slug = base_slug
    counter = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def register_user(db: Session, data: UserRegisterRequest) -> Tuple[User, str]:
    """
    Registers a new tenant organization and initial ADMIN user.
    Enforces password hashing and returns the user entity along with a signed JWT.
    """
    ensure_default_roles(db)

    # Check if email is already in use
    existing_user = db.query(User).filter(func.lower(User.email) == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists",
        )

    # Create Organization
    slug = generate_unique_slug(db, data.organization_name)
    org = Organization(
        id=uuid.uuid4(),
        name=data.organization_name,
        slug=slug,
    )
    db.add(org)
    db.flush()

    # Retrieve ADMIN role
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role:
        admin_role = Role(id=uuid.uuid4(), name="ADMIN", description="Administrator")
        db.add(admin_role)
        db.flush()

    # Hash password securely with bcrypt
    password_hash = hash_password(data.password)

    # Create User
    user = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        role_id=admin_role.id,
        email=data.email,
        password_hash=password_hash,
        first_name=data.first_name,
        last_name=data.last_name,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate JWT
    token_claims = {
        "sub": str(user.id),
        "organization_id": str(org.id),
        "role": admin_role.name,
    }
    access_token = create_access_token(token_claims)

    return user, access_token


def authenticate_user(db: Session, email: str, password: str) -> Tuple[User, str]:
    """
    Authenticates a user via email and bcrypt password.
    Returns (user, access_token).
    """
    normalized_email = email.strip().lower()

    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact your administrator.",
        )

    role_name = user.role.name if user.role else "USER"

    token_claims = {
        "sub": str(user.id),
        "organization_id": str(user.organization_id),
        "role": role_name,
    }
    access_token = create_access_token(token_claims)

    return user, access_token
