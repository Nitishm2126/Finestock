import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserCreate, UserUpdate, UserOut, UserList, RoleOut
from app.api.deps import get_current_user, require_admin
from app.core.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/roles", response_model=list[RoleOut])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Any:
    """
    List all available roles. Only available to ADMIN.
    """
    roles = db.query(Role).all()
    return roles

@router.get("/", response_model=UserList)
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    List users in the current organization.
    """
    query = db.query(User).filter(User.organization_id == current_user.organization_id)
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    return {"users": users, "total": total}

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get a specific user by ID.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Create a new user. Only available to ADMIN.
    """
    existing_user = db.query(User).filter(
        func.lower(User.email) == user_in.email.strip().lower()
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists",
        )
    
    role = db.query(Role).filter(Role.id == user_in.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role ID",
        )

    user = User(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        role_id=user_in.role_id,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        is_active=user_in.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: uuid.UUID,
    user_in: UserUpdate,
    current_user: User = Depends(require_admin),
) -> Any:
    """
    Update a user. Only available to ADMIN.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Prevent self-deactivation or self-role-change (optional safety measure)
    if user.id == current_user.id:
        if user_in.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot deactivate their own account"
            )
        if user_in.role_id and user_in.role_id != current_user.role_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Administrators cannot change their own role"
            )

    update_data = user_in.model_dump(exclude_unset=True)
    
    if "role_id" in update_data:
        role = db.query(Role).filter(Role.id == update_data["role_id"]).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role ID",
            )
            
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.commit()
    db.refresh(user)
    return user
