from fastapi import Depends
from app.models.user import User
from app.auth.security.dependencies import get_current_active_user
from app.auth.exceptions.exceptions import ForbiddenException
from app.auth.constants import UserRole

class RoleChecker:
    """
    Backward-compatible RoleChecker class.
    Checks if current authenticated user has one of the allowed roles.
    """
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.role or current_user.role.name not in self.allowed_roles:
            raise ForbiddenException("You do not have permission to access this resource.")
        return current_user

def require_roles(*allowed_roles: UserRole):
    """
    FastAPI dependency filter checking if authenticated user has any of the allowed roles.
    Uses UserRole enum instances for strict types.
    """
    def dependency(current_user: User = Depends(get_current_active_user)) -> User:
        if not current_user.role or current_user.role.name not in [role.value for role in allowed_roles]:
            raise ForbiddenException("You do not have permission to access this resource.")
        return current_user
    return dependency
