from enum import Enum
from pydantic import BaseModel
from typing import List, Optional

class AgentStatus(str, Enum):
    CLEAR = "CLEAR"
    FLAG = "FLAG"
    UNPROCESSABLE = "UNPROCESSABLE"

class AgentResultBase(BaseModel):
    agent: str
    status: AgentStatus
    riskScore: int
    signals: List[str] = []
    summary: str
    reasoning: str

class HistoryCheckerResult(AgentResultBase):
    pass

class PatternMatcherResult(AgentResultBase):
    agreesWithHistoryChecker: bool = True
    disagreementReason: Optional[str] = None
