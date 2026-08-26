from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.auth.repositories.repository import AuthRepository
from app.auth.services.jwt_service import JWTService
from app.models.user import User
from app.auth.exceptions.exceptions import InvalidTokenException, UserNotFoundException

# OAuth2 password bearer scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    FastAPI dependency to extract JWT token, validate it, and return the current authenticated user.
    """
    if not token:
        raise InvalidTokenException("Authentication token is missing.")
        
    payload = JWTService.verify_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise InvalidTokenException("Invalid token payload: user ID is missing.")
        
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise InvalidTokenException("Invalid token payload: user ID must be an integer.")
        
    user = AuthRepository.get_user_by_id(db, user_id)
    if not user:
        raise UserNotFoundException("User not found.")
        
    return user

def get_optional_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None
    try:
        payload = JWTService.verify_token(token)
        user_id = int(payload.get("sub"))
        return AuthRepository.get_user_by_id(db, user_id)
    except:
        return None

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure that the current authenticated user has verified their email.
    """
    if not current_user.is_verified:
        from app.auth.exceptions.exceptions import UserNotVerifiedException
        raise UserNotVerifiedException()
    return current_user

def get_current_role(current_user: User = Depends(get_current_user)) -> str:
    """
    Dependency to extract the user's role name.
    """
    return current_user.role.name
