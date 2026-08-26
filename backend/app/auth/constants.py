from enum import Enum

class UserRole(str, Enum):
    """
    Extensible User Roles.
    Roles are string-based to easily integrate with security claims.
    """
    FLEET_MANAGER = "Fleet Manager"
    DISPATCHER = "Dispatcher"
    SAFETY_OFFICER = "Safety Officer"
    FINANCIAL_ANALYST = "Financial Analyst"
    USER = "User"
    ADMIN = "Admin"

class OTPPurpose(str, Enum):
    """
    Defines the purposes for which OTPs can be generated.
    Ensures OTPs cannot be reused across different flows (e.g. registration OTP used to reset password).
    """
    REGISTRATION = "REGISTRATION"
    LOGIN = "LOGIN"
    FORGOT_PASSWORD = "FORGOT_PASSWORD"
