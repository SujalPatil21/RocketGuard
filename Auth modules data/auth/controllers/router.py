from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.auth.services.email_service import EmailNotificationService
from app.auth.services.auth_service import AuthService
from app.auth.services.jwt_service import JWTService
from app.auth.repositories.repository import AuthRepository
from app.auth.schemas.responses import APIResponse
from app.auth.exceptions.exceptions import InvalidTokenException, UserNotFoundException
from app.auth.schemas.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    VerifyOTPRequest,
    ResendOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    UserUpdateRequest
)
from app.auth.security.dependencies import get_current_user, oauth2_scheme
from app.auth.security.permissions import RoleChecker

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_notification_service() -> EmailNotificationService:
    """
    Dependency injector for the Notification Service interface.
    Allows easy swapping with different implementations (e.g. mock notifications or SMS notification services).
    """
    return EmailNotificationService()

def get_auth_service(notifier: EmailNotificationService = Depends(get_notification_service)) -> AuthService:
    """
    Dependency injector for AuthService.
    """
    return AuthService(notifier)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    req: UserRegisterRequest, 
    db: Session = Depends(get_db), 
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Creates a new user account and dispatches an verification code.
    """
    user, message = auth_service.register_user(db, req)
    
    # Case 3: Email exists AND user.is_verified == False
    if "already exists but hasn't been verified" in message:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": message
            }
        )

    user_data = UserResponse.model_validate(user).model_dump()
    return APIResponse.success(
        message=message,
        data={"user": user_data},
        status_code=status.HTTP_201_CREATED
    )


@router.post("/verify-otp", status_code=status.HTTP_200_OK)
def verify_otp(
    req: VerifyOTPRequest, 
    db: Session = Depends(get_db), 
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Verifies a 6-digit OTP code corresponding to user activation, sign-in challenge, or recovery.
    """
    response_data = auth_service.verify_otp_code(db, req.email, req.purpose, req.otp)
    
    # Custom message based on purpose
    message = "OTP verification successful."
    if req.purpose.value == "REGISTRATION":
        message = "Email successfully verified. You can now login."
    elif req.purpose.value == "LOGIN":
        message = "Secure login successful."
        
    return APIResponse.success(
        message=message,
        data=response_data,
        status_code=status.HTTP_200_OK
    )


@router.post("/login", status_code=status.HTTP_200_OK)
def login(
    req: UserLoginRequest, 
    db: Session = Depends(get_db), 
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Signs in a user. Returns JWT session credentials directly, or dispatches a Login OTP if configured.
    """
    result = auth_service.login_user(db, req.email, req.password)
    
    if result.get("requires_otp"):
        return APIResponse.success(
            message=result["message"],
            data={"requires_otp": True},
            status_code=status.HTTP_200_OK
        )
        
    return APIResponse.success(
        message="Login successful.",
        data={
            "requires_otp": False,
            "access_token": result["access_token"],
            "token_type": result["token_type"],
            "role": result["role"],
            "username": result["username"]
        },
        status_code=status.HTTP_200_OK
    )


@router.post("/resend-otp", status_code=status.HTTP_200_OK)
def resend_otp(
    req: ResendOTPRequest, 
    db: Session = Depends(get_db), 
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Resends verification codes for Registration, Login, or Password Recovery.
    Imposes a 45-second rate limit.
    """
    message = auth_service.resend_otp_code(db, req.email, req.purpose)
    return APIResponse.success(
        message=message,
        status_code=status.HTTP_200_OK
    )


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    req: ForgotPasswordRequest, 
    db: Session = Depends(get_db), 
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Triggers recovery process, emailing a password reset authorization code.
    """
    message = auth_service.trigger_forgot_password(db, req.email)
    return APIResponse.success(
        message=message,
        status_code=status.HTTP_200_OK
    )


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    req: ResetPasswordRequest, 
    db: Session = Depends(get_db), 
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Overwrites the account password after confirming a valid reset verification OTP.
    """
    auth_service.reset_password(db, req)
    return APIResponse.success(
        message="Password updated successfully. You can now login with your new password.",
        status_code=status.HTTP_200_OK
    )


@router.get("/me", status_code=status.HTTP_200_OK)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    """
    Validates token authorization and returns current user details.
    """
    user_data = UserResponse.model_validate(current_user).model_dump()
    return APIResponse.success(
        message="User profile retrieved successfully.",
        data={"user": user_data},
        status_code=status.HTTP_200_OK
    )

@router.put("/me", status_code=status.HTTP_200_OK)
def update_me(
    req: UserUpdateRequest, 
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Updates the authenticated user's profile information.
    """
    from app.models.user import User
    
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise UserNotFoundException()
        
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    
    user_data = UserResponse.model_validate(user).model_dump()
    return APIResponse.success(
        message="Profile updated successfully.",
        data={"user": user_data},
        status_code=status.HTTP_200_OK
    )

@router.delete("/me", status_code=status.HTTP_200_OK)
def delete_me(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Deletes the authenticated user's account permanently.
    """
    from app.models.user import User
    
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise UserNotFoundException()
        
    db.delete(user)
    db.commit()
    
    return APIResponse.success(
        message="Account deleted successfully.",
        status_code=status.HTTP_200_OK
    )


