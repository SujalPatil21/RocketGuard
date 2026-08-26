from pydantic import BaseModel
from typing import Optional

class VerificationResult(BaseModel):
    agent: str = "verifier"
    verificationRequired: bool
    method: str
    trustedSource: str
    instruction: str
    warning: str
