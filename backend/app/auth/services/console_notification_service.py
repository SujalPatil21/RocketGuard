import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class ConsoleNotificationService:
    """
    Demo-mode notification service.

    When DEMO_MODE=true this replaces EmailNotificationService so the demo
    can be run without SMTP credentials.  The OTP is printed to the server
    console so a tester can copy-paste it into the frontend.

    SECURITY NOTES:
    - OTP generation, hashing, expiry, and verification are UNCHANGED.
    - This class only changes the *delivery channel* — not any crypto logic.
    - Never activate DEMO_MODE in production.
    """

    def _log_otp(self, purpose: str, email: str, otp: str, expires_in_seconds: int) -> bool:
        expiry_minutes = expires_in_seconds // 60
        logger.warning(
            "\n"
            "╔══════════════════════════════════════════╗\n"
            "║         DEMO MODE — OTP DELIVERY         ║\n"
            f"║  Purpose  : {purpose:<29}║\n"
            f"║  Recipient: {email:<29}║\n"
            f"║  OTP Code : {otp:<29}║\n"
            f"║  Expires  : {expiry_minutes} minutes{' ' * (22 - len(str(expiry_minutes)))}║\n"
            "╚══════════════════════════════════════════╝"
        )
        return True

    def send_registration_otp(self, email: str, username: str, otp: str, expires_in_seconds: int) -> bool:
        return self._log_otp("REGISTRATION", email, otp, expires_in_seconds)

    def send_login_otp(self, email: str, username: str, otp: str, expires_in_seconds: int) -> bool:
        return self._log_otp("LOGIN", email, otp, expires_in_seconds)

    def send_forgot_password_otp(self, email: str, username: str, otp: str, expires_in_seconds: int) -> bool:
        return self._log_otp("FORGOT_PASSWORD", email, otp, expires_in_seconds)
