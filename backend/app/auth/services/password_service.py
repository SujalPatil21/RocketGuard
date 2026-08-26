import bcrypt

class PasswordService:
    """
    Password security service.
    Handles secure one-way hashing of passwords using bcrypt.
    """

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hashes a plaintext password using bcrypt and a secure salt.
        """
        # Convert password to bytes, generate salt, hash, and decode back to string for storage
        # ponytail: use native bcrypt library directly to avoid deprecated passlib dependencies
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_bytes = bcrypt.hashpw(password_bytes, salt)
        return hashed_bytes.decode('utf-8')

    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """
        Verifies a plaintext password matches the stored bcrypt hash.
        """
        password_bytes = password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
