from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SCREENING = "SCREENING"
    CLEAR = "CLEAR"
    HELD = "HELD"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    UNPROCESSABLE = "UNPROCESSABLE"

class PaymentRequest(BaseModel):
    invoice_id: str
    vendor_id: str
    vendor_name: str
    amount: float
    currency: str
    due_date: str
    bank_account: str
    ifsc: str
    requested_by: str
    request_message: str
    submitted_at: str
    request_type: str

class PaymentResult(BaseModel):
    payment: PaymentRequest
    status: PaymentStatus = PaymentStatus.PENDING
    risk_score: int = 0
    signals: List[str] = []
    requires_human_review: bool = False
    
    # Agent Results
    history_checker_result: Optional[dict] = None
    pattern_matcher_result: Optional[dict] = None
    verifier_result: Optional[dict] = None
    
    # Audit trail
    audit_events: List[dict] = []
