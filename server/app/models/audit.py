from pydantic import BaseModel
from typing import Dict, Any, Optional

class AuditEvent(BaseModel):
    timestamp: str
    type: str
    message: str
    metadata: Optional[Dict[str, Any]] = {}
