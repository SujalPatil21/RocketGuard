import re
from app.auth.exceptions.exceptions import PasswordValidationException

def validate_password_strength(password: str) -> None:
    """
    Validates that a password meets complexity rules:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one number.")
    # Special character list: !@#$%^&*(),.?":{}|<>
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("Password must contain at least one special character.")
        
    if errors:
        raise PasswordValidationException(
            message="Password validation failed.",
            errors={"password": errors}
        )
