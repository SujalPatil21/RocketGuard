import datetime
from sqlalchemy import select, delete
from sqlalchemy.orm import Session, joinedload
from app.models.user import User, OTPVerification

class AuthRepository:
    """
    Authentication Repository Layer.
    Encapsulates all database read and write queries using SQLAlchemy 2.x standard commands.
    Ensures business services have no direct coupling with query syntax.
    """

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User | None:
        """
        Retrieves a user by their database primary key.
        """
        stmt = select(User).options(joinedload(User.role)).where(User.id == user_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User | None:
        """
        Retrieves a user by their unique email address.
        """
        stmt = select(User).options(joinedload(User.role)).where(User.email == email)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> User | None:
        """
        Retrieves a user by their unique username.
        """
        stmt = select(User).options(joinedload(User.role)).where(User.username == username)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_user(db: Session, user: User) -> User:
        """
        Persists a new user record in the database.
        """
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user: User) -> User:
        """
        Saves modifications to an existing user record.
        """
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_active_otp(db: Session, user_id: int, purpose: str) -> OTPVerification | None:
        """
        Retrieves an unexpired OTP code mapped to a user and specific purpose.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        stmt = select(OTPVerification).where(
            OTPVerification.user_id == user_id,
            OTPVerification.purpose == purpose,
            OTPVerification.expires_at > now
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def get_any_otp_by_user_and_purpose(db: Session, user_id: int, purpose: str) -> OTPVerification | None:
        """
        Retrieves any OTP record regardless of expiration for cleanup purposes.
        """
        stmt = select(OTPVerification).where(
            OTPVerification.user_id == user_id,
            OTPVerification.purpose == purpose
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def create_otp(db: Session, otp_record: OTPVerification) -> OTPVerification:
        """
        Persists a new OTP verification record.
        """
        db.add(otp_record)
        db.commit()
        db.refresh(otp_record)
        return otp_record

    @staticmethod
    def delete_otp(db: Session, otp_id: int) -> None:
        """
        Removes a specific OTP verification record.
        """
        stmt = delete(OTPVerification).where(OTPVerification.id == otp_id)
        db.execute(stmt)
        db.commit()

    @staticmethod
    def delete_otps_by_user_and_purpose(db: Session, user_id: int, purpose: str) -> None:
        """
        Removes all OTP records for a specific user and purpose.
        """
        stmt = delete(OTPVerification).where(
            OTPVerification.user_id == user_id,
            OTPVerification.purpose == purpose
        )
        db.execute(stmt)
        db.commit()

    @staticmethod
    def delete_expired_otps(db: Session) -> None:
        """
        Housekeeping task: deletes all expired OTP records from the database.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        stmt = delete(OTPVerification).where(OTPVerification.expires_at <= now).execution_options(synchronize_session=False)
        db.execute(stmt)
        db.commit()
