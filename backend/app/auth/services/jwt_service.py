import datetime
import jwt
from typing import Dict, Any
from app.core.config import settings
from app.auth.exceptions.exceptions import InvalidTokenException, TokenExpiredException

class JWTService:
    """
    Service responsible for JSON Web Token generation and validation.
    Enforces payload restriction and cryptographic signature validation using HS256.
    """

    @staticmethod
    def create_access_token(user_id: int, role: str) -> str:
        """
        Generates a new signed JWT access token.
        Contains only: sub (user_id), role, and exp.
        """
        # Set expiration timestamp using UTC time
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
        payload = {
            "sub": str(user_id),
            "role": role,
            "exp": int(expire.timestamp())
        }
        
        # Sign and encode the token using the secret and algorithm specified in configuration
        token = jwt.encode(
            payload, 
            settings.JWT_SECRET, 
            algorithm=settings.JWT_ALGORITHM
        )
        return token

    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """
        Decodes and verifies a JWT token.
        Raises TokenExpiredException if expired, or InvalidTokenException if invalid.
        """
        try:
            # Decode using the strict configurations
            payload = jwt.decode(
                token, 
                settings.JWT_SECRET, 
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Double check required fields exist in payload to maintain contract safety
            if not all(k in payload for k in ("sub", "role", "exp")):
                raise InvalidTokenException("Token payload is missing required claims.")
                
            return payload
            
        except jwt.ExpiredSignatureError:
            raise TokenExpiredException()
        except jwt.InvalidTokenError:
            raise InvalidTokenException()
        except Exception:
            raise InvalidTokenException("Failed to decode token.")
