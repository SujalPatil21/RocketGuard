from fastapi import status

class AuthException(Exception):
    """
    Base Exception class for Authentication related errors.
    """
    def __init__(self, message: str, error_code: str, status_code: int = status.HTTP_400_BAD_REQUEST, data: dict = None, errors: dict = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.data = data or {}
        self.errors = errors or {}

class UserAlreadyExistsException(AuthException):
    def __init__(self, message: str, error_code: str = "USER_ALREADY_EXISTS"):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_409_CONFLICT
        )

class InvalidCredentialsException(AuthException):
    def __init__(self, message: str = "Invalid email or password."):
        super().__init__(
            message=message,
            error_code="INVALID_CREDENTIALS",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

class UserNotVerifiedException(AuthException):
    def __init__(self, message: str = "Please verify your email before signing in."):
        super().__init__(
            message=message,
            error_code="USER_NOT_VERIFIED",
            status_code=status.HTTP_403_FORBIDDEN
        )

class LockedAccountException(AuthException):
    def __init__(self, minutes: int = 15, message: str = None):
        if not message:
            message = f"Too many failed login attempts. Please try again in {minutes} minutes."
        super().__init__(
            message=message,
            error_code="LOCKED_ACCOUNT",
            status_code=status.HTTP_403_FORBIDDEN
        )

class UserNotFoundException(AuthException):
    def __init__(self, message: str = "User not found."):
        super().__init__(
            message=message,
            error_code="USER_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )

class InvalidOTPException(AuthException):
    def __init__(self, message: str = "Invalid verification code."):
        super().__init__(
            message=message,
            error_code="INVALID_OTP",
            status_code=status.HTTP_400_BAD_REQUEST
        )

class ExpiredOTPException(AuthException):
    def __init__(self, message: str = "This verification code has expired. Please request a new code."):
        super().__init__(
            message=message,
            error_code="EXPIRED_OTP",
            status_code=status.HTTP_400_BAD_REQUEST
        )

class OTPCooldownException(AuthException):
    def __init__(self, retry_after: int, message: str = None):
        if not message:
            message = f"Please wait {retry_after} seconds before requesting another OTP."
        super().__init__(
            message=message,
            error_code="OTP_COOLDOWN",
            status_code=status.HTTP_400_BAD_REQUEST,
            data={"retry_after": retry_after}
        )

class PasswordValidationException(AuthException):
    def __init__(self, message: str = "Password validation failed.", errors: dict = None):
        super().__init__(
            message=message,
            error_code="PASSWORD_VALIDATION_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST,
            errors=errors
        )

class PasswordsDoNotMatchException(AuthException):
    def __init__(self, message: str = "Passwords do not match."):
        super().__init__(
            message=message,
            error_code="PASSWORDS_DO_NOT_MATCH",
            status_code=status.HTTP_400_BAD_REQUEST
        )

class TokenExpiredException(AuthException):
    def __init__(self, message: str = "Authentication token has expired."):
        super().__init__(
            message=message,
            error_code="TOKEN_EXPIRED",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

class InvalidTokenException(AuthException):
    def __init__(self, message: str = "Invalid authentication token."):
        super().__init__(
            message=message,
            error_code="INVALID_TOKEN",
            status_code=status.HTTP_401_UNAUTHORIZED
        )

class EmailSendFailedException(AuthException):
    def __init__(self, message: str = "We couldn't send your verification email. Please try Resend OTP."):
        super().__init__(
            message=message,
            error_code="EMAIL_SEND_FAILED",
            status_code=status.HTTP_400_BAD_REQUEST
        )

class EmailAlreadyRegisteredException(AuthException):
    def __init__(self, message: str = "An account with this email already exists. Please sign in.", error_code: str = "EMAIL_ALREADY_REGISTERED"):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_409_CONFLICT
        )

class ForbiddenException(AuthException):
    def __init__(self, message: str = "You do not have permission to access this resource."):
        super().__init__(
            message=message,
            error_code="FORBIDDEN",
            status_code=status.HTTP_403_FORBIDDEN
        )


