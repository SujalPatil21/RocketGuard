from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Generic, TypeVar, Optional, Any
from app.auth.constants import UserRole, OTPPurpose

# Define generic type variable for standard data response payloads
T = TypeVar("T")

class StandardResponse(BaseModel, Generic[T]):
    """
    Standard Success Response schema.
    """
    success: bool = True
    message: str
    data: Optional[T] = None

class FailureResponse(BaseModel):
    """
    Standard Failure Response schema.
    """
    success: bool = False
    message: str
    errorCode: str

class UserRegisterRequest(BaseModel):
    """
    Request schema for user registration.
    Username is optional — derived internally from the email local-part when omitted.
    confirm_password is optional — the frontend validates match before submitting.
    """
    full_name: Optional[str] = Field(None, description="User's full name")
    username: Optional[str] = Field(None, min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$", description="Username (auto-derived from email if omitted)")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., description="Strong password")
    confirm_password: Optional[str] = Field(None, description="Confirm password (validated client-side)")

class UserLoginRequest(BaseModel):
    """
    Request schema for user login.
    """
    email: EmailStr = Field(..., description="Account email address")
    password: str = Field(..., description="Account password")

class VerifyOTPRequest(BaseModel):
    """
    Request schema for verifying OTP.
    """
    email: EmailStr = Field(..., description="Account email address")
    purpose: OTPPurpose = Field(..., description="Purpose of verification (REGISTRATION/LOGIN/FORGOT_PASSWORD)")
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$", description="6-digit verification code")

class ResendOTPRequest(BaseModel):
    """
    Request schema to resend OTP.
    """
    email: EmailStr = Field(..., description="Account email address")
    purpose: OTPPurpose = Field(..., description="Purpose of verification")

class ForgotPasswordRequest(BaseModel):
    """
    Request schema for forgotten password triggers.
    """
    email: EmailStr = Field(..., description="Account email address")

class ResetPasswordRequest(BaseModel):
    """
    Request schema to reset password with an OTP.
    """
    email: EmailStr = Field(..., description="Account email address")
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$", description="6-digit verification code")
    new_password: str = Field(..., min_length=8, description="Strong new password")
    confirm_password: str = Field(..., description="Confirm password must match new password")

class TokenData(BaseModel):
    """
    Access token payload content representation.
    """
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

class UserUpdateRequest(BaseModel):
    """
    Request schema for user profile updates.
    """
    full_name: Optional[str] = Field(None, description="User's full name")
    language: Optional[str] = Field(None, description="Preferred language (e.g. en)")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")

class UserResponse(BaseModel):
    """
    Serialized User info returned in response payloads.
    """
    id: int
    username: str
    email: EmailStr
    role: UserRole
    is_verified: bool
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    language: Optional[str] = "en"
    
    @field_validator("role", mode="before")
    @classmethod
    def get_role_name(cls, v: Any) -> str:
        if hasattr(v, "name"):
            return v.name
        return str(v)
    
    class Config:
        from_attributes = True
