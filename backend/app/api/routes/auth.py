from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    AuthResponse,
    CurrentUserResponse,
    SafeUserResponse,
)
from app.services.auth_service import register_user, authenticate_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new organization and admin user",
)
def register(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Registers a new tenant organization and its initial administrator account.
    Hashes the password with bcrypt and returns a signed access token.
    """
    user, access_token = register_user(db, payload)
    role_name = user.role.name if user.role else "ADMIN"

    return AuthResponse(
        success=True,
        access_token=access_token,
        token_type="bearer",
        user=SafeUserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=role_name,
            organization_id=user.organization_id,
            is_active=user.is_active,
        ),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in with email and password",
)
def login(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticates user credentials and issues a signed JWT access token.
    Never returns passwords or internal secrets.
    """
    user, access_token = authenticate_user(db, payload.email, payload.password)
    role_name = user.role.name if user.role else "USER"

    return AuthResponse(
        success=True,
        access_token=access_token,
        token_type="bearer",
        user=SafeUserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=role_name,
            organization_id=user.organization_id,
            is_active=user.is_active,
        ),
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated profile",
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the profile and role of the currently authenticated user.
    Requires Bearer token in the Authorization header.
    """
    role_name = current_user.role.name if current_user.role else "USER"

    return CurrentUserResponse(
        success=True,
        user=SafeUserResponse(
            id=current_user.id,
            email=current_user.email,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            role=role_name,
            organization_id=current_user.organization_id,
            is_active=current_user.is_active,
        ),
    )
