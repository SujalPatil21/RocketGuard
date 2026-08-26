import datetime
import logging
from sqlalchemy.orm import Session

from app.auth.repositories.repository import AuthRepository
from app.auth.services.password_service import PasswordService
from app.auth.services.otp_service import OTPService
from app.auth.services.jwt_service import JWTService
from app.auth.services.email_service import EmailNotificationService
from app.core.config import settings
from app.auth.constants import OTPPurpose
from app.models.user import User, OTPVerification
from app.auth.validators.validators import validate_password_strength
from app.auth.exceptions.exceptions import (
    UserAlreadyExistsException,
    InvalidCredentialsException,
    UserNotVerifiedException,
    UserNotFoundException,
    InvalidOTPException,
    ExpiredOTPException,
    OTPCooldownException,
    PasswordsDoNotMatchException,
    EmailSendFailedException,
    EmailAlreadyRegisteredException,
    LockedAccountException
)

logger = logging.getLogger(__name__)

class AuthService:
    """
    Core Authentication Service.
    Implements business processes for registration, verification, login,
    cooldown-enforced OTP generation, and password recovery.
    """

    def __init__(self, notifier: EmailNotificationService):
        self.repo = AuthRepository()
        self.notifier = notifier

    def register_user(self, db: Session, req) -> tuple[User, str]:
        """
        Registers a new user, hashes their password, and schedules email verification.
        """
        logger.info("Registration Started")

        # Validate password matches confirmation
        if req.password != req.confirm_password:
            logger.info(f"[AUDIT] Registration Failure: passwords mismatch for username={req.username}")
            raise PasswordsDoNotMatchException()

        # Validate password strength rules
        validate_password_strength(req.password)

        # Check if email is already registered
        existing_user = self.repo.get_user_by_email(db, req.email)
        if existing_user:
            if existing_user.is_verified:
                logger.info(f"[AUDIT] Registration Failure: email taken={req.email}")
                raise EmailAlreadyRegisteredException()
            else:
                logger.info(f"[AUDIT] Existing Unverified User Detected: email={req.email}")
                
                # 1. Delete previous REGISTRATION OTP
                self.repo.delete_otps_by_user_and_purpose(db, existing_user.id, OTPPurpose.REGISTRATION.value)
                logger.info(f"OTP Deleted: user_id={existing_user.id}, purpose={OTPPurpose.REGISTRATION.value}")

                # 2. Generate new OTP
                plain_otp = OTPService.generate_otp()
                otp_hash = OTPService.hash_otp(plain_otp)
                logger.info(f"OTP Generated: user_id={existing_user.id}, purpose={OTPPurpose.REGISTRATION.value}")

                # Calculate expiry timestamp
                expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
                    seconds=settings.OTP_EXPIRY
                )

                # 3. Store new OTP
                otp_record = OTPVerification(
                    user_id=existing_user.id,
                    purpose=OTPPurpose.REGISTRATION.value,
                    otp_hash=otp_hash,
                    expires_at=expires_at
                )
                self.repo.create_otp(db, otp_record)

                # 4. Send new OTP
                email_sent = self.notifier.send_registration_otp(
                    email=existing_user.email,
                    username=existing_user.username,
                    otp=plain_otp,
                    expires_in_seconds=settings.OTP_EXPIRY
                )

                if email_sent:
                    logger.info(f"OTP Resent: user_id={existing_user.id}, email={existing_user.email}")
                    logger.info("Registration Completed")
                    return existing_user, "An account with this email exists but has not been verified. A new verification OTP has been sent."
                else:
                    logger.info(f"[AUDIT] Registration Resend (Email Fail): username={existing_user.username}")
                    raise EmailSendFailedException()

        # Check if username is already taken by a DIFFERENT user
        user_by_username = self.repo.get_user_by_username(db, req.username)
        if user_by_username and user_by_username.email != req.email:
            logger.info(f"[AUDIT] Registration Failure: username taken={req.username}")
            raise UserAlreadyExistsException(
                "This username is already taken. Please choose a different one."
            )

        # Securely hash password before writing to the database
        password_hash = PasswordService.hash_password(req.password)

        # Get default role from database
        from app.models.user import Role
        dispatcher_role = db.query(Role).filter_by(name="User").first()
        if not dispatcher_role:
            dispatcher_role = Role(name="User")
            db.add(dispatcher_role)
            db.commit()
            db.refresh(dispatcher_role)

        # Create user record (is_verified = False)
        new_user = User(
            username=req.username,
            email=req.email,
            password_hash=password_hash,
            role_id=dispatcher_role.id,
            is_verified=False
        )
        user = self.repo.create_user(db, new_user)

        # Clean up any existing OTPs for registration for this user (fail-safe)
        self.repo.delete_otps_by_user_and_purpose(db, user.id, OTPPurpose.REGISTRATION.value)
        logger.info(f"OTP Deleted: user_id={user.id}, purpose={OTPPurpose.REGISTRATION.value}")

        # Generate a secure 6-digit verification code
        plain_otp = OTPService.generate_otp()
        otp_hash = OTPService.hash_otp(plain_otp)
        logger.info(f"OTP Generated: user_id={user.id}, purpose={OTPPurpose.REGISTRATION.value}")
        
        # Calculate expiry timestamp
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            seconds=settings.OTP_EXPIRY
        )

        otp_record = OTPVerification(
            user_id=user.id,
            purpose=OTPPurpose.REGISTRATION.value,
            otp_hash=otp_hash,
            expires_at=expires_at
        )
        self.repo.create_otp(db, otp_record)

        # Send SMTP Email
        email_sent = self.notifier.send_registration_otp(
            email=user.email,
            username=user.username,
            otp=plain_otp,
            expires_in_seconds=settings.OTP_EXPIRY
        )

        if email_sent:
            logger.info("Registration Completed")
            logger.info(f"[AUDIT] Registration Success: username={user.username}")
            return user, "Registration successful. Please check your email for the verification code."
        else:
            logger.info(f"[AUDIT] Registration Success (Email Fail): username={user.username}")
            raise EmailSendFailedException()

    def verify_otp_code(self, db: Session, email: str, purpose: OTPPurpose, otp: str) -> dict:
        """
        Verifies a user-provided OTP code according to strict flow.
        """
        # Retrieve user
        user = self.repo.get_user_by_email(db, email)
        if not user:
            raise InvalidOTPException()

        # Find any OTP record matching the user and purpose (regardless of expiry)
        otp_record = self.repo.get_any_otp_by_user_and_purpose(db, user.id, purpose.value)
        
        # Delete expired OTPs from the database (cleanup mechanism preserved)
        self.repo.delete_expired_otps(db)

        if not otp_record:
            logger.info(f"[AUDIT] Authentication Failure: no OTP found for user_id={user.id}, purpose={purpose.value}")
            raise InvalidOTPException()

        # Check if the retrieved record was actually expired
        now = datetime.datetime.now(datetime.timezone.utc)
        # Ensure timezone info is present for comparison
        if otp_record.expires_at.tzinfo is None:
            otp_record_expires_at = otp_record.expires_at.replace(tzinfo=datetime.timezone.utc)
        else:
            otp_record_expires_at = otp_record.expires_at
            
        if otp_record_expires_at <= now:
            logger.info(f"[AUDIT] Authentication Failure: OTP expired for user_id={user.id}, purpose={purpose.value}")
            raise ExpiredOTPException()

        # Validate matching OTP code
        if not OTPService.verify_otp(otp, otp_record.otp_hash):
            logger.info(f"[AUDIT] Authentication Failure: incorrect OTP for user_id={user.id}, purpose={purpose.value}")
            raise InvalidOTPException()

        # Side-effects based on purpose
        response_data = {}
        if purpose == OTPPurpose.REGISTRATION:
            user.is_verified = True
            self.repo.update_user(db, user)
            logger.info(f"[AUDIT] OTP Verified: user_id={user.id}, purpose={purpose.value}")
            logger.info(f"[AUDIT] User Activated: user_id={user.id}")

        elif purpose == OTPPurpose.LOGIN:
            # Login successful, issue JWT token
            access_token = JWTService.create_access_token(
                user_id=user.id,
                role=user.role.name
            )
            response_data = {
                "access_token": access_token,
                "token_type": "bearer",
                "role": user.role.name,
                "username": user.username
            }
            logger.info(f"[AUDIT] OTP Verified: user_id={user.id}, purpose={purpose.value}")
            logger.info(f"[AUDIT] Login Success: username={user.username}")

        # Delete the validated OTP record
        self.repo.delete_otp(db, otp_record.id)
        
        return response_data

    def login_user(self, db: Session, email: str, password: str) -> dict:
        """
        Verifies credentials, checks verification status, and processes sign-in.
        Returns JWT token if success, or triggers OTP challenge if ENABLE_LOGIN_OTP is active.
        """
        user = self.repo.get_user_by_email(db, email)
        if not user:
            logger.info(f"[AUDIT] Login Failure: account does not exist email={email}")
            raise InvalidCredentialsException()

        # Check if account is locked
        now = datetime.datetime.now(datetime.timezone.utc)
        if user.locked_until and user.locked_until > now:
            logger.info(f"[AUDIT] Login Failure: locked account for username={user.username}")
            raise LockedAccountException(f"Account locked until {user.locked_until.strftime('%H:%M:%S UTC')}")

        # Verify password matches bcrypt hash
        if not PasswordService.verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = now + datetime.timedelta(minutes=15)
                logger.info(f"[AUDIT] Account Locked: username={user.username}")
            self.repo.update_user(db, user)
            logger.info(f"[AUDIT] Login Failure: wrong password for username={user.username}")
            raise InvalidCredentialsException()

        # Enforce email verification status before signing in
        if not user.is_verified:
            logger.info(f"[AUDIT] Login Failure: unverified email for username={user.username}")
            raise UserNotVerifiedException()

        # Reset failed attempts on successful login
        if user.failed_login_attempts > 0 or user.locked_until:
            user.failed_login_attempts = 0
            user.locked_until = None
            self.repo.update_user(db, user)

        # Check if Login OTP is enabled
        if settings.ENABLE_LOGIN_OTP:
            # Delete any existing login OTPs
            self.repo.delete_otps_by_user_and_purpose(db, user.id, OTPPurpose.LOGIN.value)

            # Generate OTP
            plain_otp = OTPService.generate_otp()
            otp_hash = OTPService.hash_otp(plain_otp)
            expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
                seconds=settings.OTP_EXPIRY
            )

            otp_record = OTPVerification(
                user_id=user.id,
                purpose=OTPPurpose.LOGIN.value,
                otp_hash=otp_hash,
                expires_at=expires_at
            )
            self.repo.create_otp(db, otp_record)
            logger.info(f"[AUDIT] OTP Generated: user_id={user.id}, purpose={OTPPurpose.LOGIN.value}")

            # Send Email
            email_sent = self.notifier.send_login_otp(
                email=user.email,
                username=user.username,
                otp=plain_otp,
                expires_in_seconds=settings.OTP_EXPIRY
            )

            if not email_sent:
                logger.info(f"[AUDIT] Login Failure (Email Fail): user_id={user.id}")
                raise EmailSendFailedException()

            return {
                "requires_otp": True,
                "message": "Verification code sent to email."
            }

        # Otherwise: Generate and return standard Access JWT Token directly
        access_token = JWTService.create_access_token(
            user_id=user.id,
            role=user.role.name
        )
        
        logger.info(f"[AUDIT] Login Success: username={user.username}")
        return {
            "requires_otp": False,
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role.name,
            "username": user.username
        }

    def resend_otp_code(self, db: Session, email: str, purpose: OTPPurpose) -> str:
        """
        Handles Resend OTP requests. Enforces a 45-second cooldown timer.
        """
        # Clean up stale OTP records first
        self.repo.delete_expired_otps(db)

        # Retrieve user
        user = self.repo.get_user_by_email(db, email)
        if not user:
            raise UserNotFoundException("No user found with the provided email.")

        # Find any existing OTP for this user and purpose to inspect cooldown
        existing_otp = self.repo.get_any_otp_by_user_and_purpose(db, user.id, purpose.value)
        if existing_otp:
            # Check elapsed time since OTP creation
            now = datetime.datetime.now(datetime.timezone.utc)
            # Ensure timezone safety
            created_at = existing_otp.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=datetime.timezone.utc)
            
            elapsed = (now - created_at).total_seconds()
            
            if elapsed < settings.RESEND_DELAY:
                retry_after = int(settings.RESEND_DELAY - elapsed)
                logger.info(f"[AUDIT] OTP Resent Failure (Cooldown): user_id={user.id}, retry_after={retry_after}")
                raise OTPCooldownException(retry_after=retry_after)

        # Delete any previous OTP records for this purpose
        self.repo.delete_otps_by_user_and_purpose(db, user.id, purpose.value)

        # Generate and store a new OTP
        plain_otp = OTPService.generate_otp()
        otp_hash = OTPService.hash_otp(plain_otp)
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            seconds=settings.OTP_EXPIRY
        )

        otp_record = OTPVerification(
            user_id=user.id,
            purpose=purpose.value,
            otp_hash=otp_hash,
            expires_at=expires_at
        )
        self.repo.create_otp(db, otp_record)
        logger.info(f"[AUDIT] OTP Generated: user_id={user.id}, purpose={purpose.value}")
        logger.info(f"[AUDIT] OTP Resent: user_id={user.id}")

        # Send new OTP
        email_sent = False
        if purpose == OTPPurpose.REGISTRATION:
            email_sent = self.notifier.send_registration_otp(
                email=user.email,
                username=user.username,
                otp=plain_otp,
                expires_in_seconds=settings.OTP_EXPIRY
            )
        elif purpose == OTPPurpose.LOGIN:
            email_sent = self.notifier.send_login_otp(
                email=user.email,
                username=user.username,
                otp=plain_otp,
                expires_in_seconds=settings.OTP_EXPIRY
            )
        elif purpose == OTPPurpose.FORGOT_PASSWORD:
            email_sent = self.notifier.send_forgot_password_otp(
                email=user.email,
                username=user.username,
                otp=plain_otp,
                expires_in_seconds=settings.OTP_EXPIRY
            )

        if email_sent:
            return "Verification code has been resent to your email."
        else:
            logger.info(f"[AUDIT] OTP Resent Failure (Email Fail): user_id={user.id}")
            raise EmailSendFailedException()

    def trigger_forgot_password(self, db: Session, email: str) -> str:
        """
        Triggers the forgot password flow.
        Generates and sends a reset verification OTP.
        """
        user = self.repo.get_user_by_email(db, email)
        # Security best practice: anti-enumeration
        if not user:
            logger.info(f"[AUDIT] Forgot Password triggered for non-existent email={email}")
            return "If an account exists with this email, a password reset OTP has been sent."

        # Delete any existing forgot password OTPs
        self.repo.delete_otps_by_user_and_purpose(db, user.id, OTPPurpose.FORGOT_PASSWORD.value)

        # Generate new reset OTP
        plain_otp = OTPService.generate_otp()
        otp_hash = OTPService.hash_otp(plain_otp)
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            seconds=settings.OTP_EXPIRY
        )

        otp_record = OTPVerification(
            user_id=user.id,
            purpose=OTPPurpose.FORGOT_PASSWORD.value,
            otp_hash=otp_hash,
            expires_at=expires_at
        )
        self.repo.create_otp(db, otp_record)
        logger.info(f"[AUDIT] OTP Generated: user_id={user.id}, purpose={OTPPurpose.FORGOT_PASSWORD.value}")

        # Send reset email
        email_sent = self.notifier.send_forgot_password_otp(
            email=user.email,
            username=user.username,
            otp=plain_otp,
            expires_in_seconds=settings.OTP_EXPIRY
        )

        if email_sent:
            return "If an account exists with this email, a password reset OTP has been sent."
        else:
            logger.info(f"[AUDIT] Forgot Password Failure (Email Fail): user_id={user.id}")
            raise EmailSendFailedException()

    def reset_password(self, db: Session, req) -> None:
        """
        Verifies the reset OTP and updates the user's password.
        """
        # Validate passwords match
        if req.new_password != req.confirm_password:
            raise PasswordsDoNotMatchException()

        # Validate password strength
        validate_password_strength(req.new_password)

        # Retrieve user
        user = self.repo.get_user_by_email(db, req.email)
        if not user:
            raise InvalidOTPException()

        # Find any forgot-password OTP record (regardless of expiry)
        otp_record = self.repo.get_any_otp_by_user_and_purpose(db, user.id, OTPPurpose.FORGOT_PASSWORD.value)
        
        # Housekeeping: delete expired OTPs
        self.repo.delete_expired_otps(db)

        if not otp_record:
            logger.info(f"[AUDIT] Password Reset Failure: no OTP for user_id={user.id}")
            raise InvalidOTPException()

        # Check if expired
        now = datetime.datetime.now(datetime.timezone.utc)
        if otp_record.expires_at.tzinfo is None:
            otp_record_expires_at = otp_record.expires_at.replace(tzinfo=datetime.timezone.utc)
        else:
            otp_record_expires_at = otp_record.expires_at
            
        if otp_record_expires_at <= now:
            logger.info(f"[AUDIT] Password Reset Failure: OTP expired for user_id={user.id}")
            raise ExpiredOTPException()

        # Verify matching code
        if not OTPService.verify_otp(req.otp, otp_record.otp_hash):
            logger.info(f"[AUDIT] Password Reset Failure: incorrect OTP for user_id={user.id}")
            raise InvalidOTPException()

        # Hash and update user's password
        user.password_hash = PasswordService.hash_password(req.new_password)
        self.repo.update_user(db, user)
        logger.info(f"[AUDIT] Password Reset Success: user_id={user.id}")

        # Delete the OTP code
        self.repo.delete_otp(db, otp_record.id)
