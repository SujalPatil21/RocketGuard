from sqlalchemy import Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
import uuid

from app.db.database import Base
from app.models.user import UTCDateTime


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trusted_contacts: Mapped[str | None] = mapped_column(Text, nullable=True) # JSON string
    bank_information: Mapped[str | None] = mapped_column(Text, nullable=True) # JSON string
    normal_behavior: Mapped[str | None] = mapped_column(Text, nullable=True) # JSON string

    payments: Mapped[list["Payment"]] = relationship("Payment", back_populates="vendor", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True) # Invoice ID
    vendor_id: Mapped[str] = mapped_column(String(50), ForeignKey("vendors.id"), nullable=False, index=True)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    due_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_account: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ifsc: Mapped[str | None] = mapped_column(String(50), nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    request_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    request_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    requires_human_review: Mapped[bool] = mapped_column(Boolean, default=False)
    provenance: Mapped[str] = mapped_column(String(50), default="EXISTING_SEED")
    scenario_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    submitted_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    vendor: Mapped["Vendor"] = relationship("Vendor", back_populates="payments")
    signals: Mapped[list["RiskSignal"]] = relationship("RiskSignal", back_populates="payment", cascade="all, delete-orphan")
    campaign_payments: Mapped[list["CampaignPayment"]] = relationship("CampaignPayment", back_populates="payment", cascade="all, delete-orphan")


class RiskSignal(Base):
    __tablename__ = "risk_signals"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=generate_uuid, index=True)
    payment_id: Mapped[str] = mapped_column(String(50), ForeignKey("payments.id"), nullable=False, index=True)
    agent_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    payment: Mapped["Payment"] = relationship("Payment", back_populates="signals")


class AttackCampaign(Base):
    __tablename__ = "attack_campaigns"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, default=generate_uuid, index=True)
    campaign_type: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    stage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_exposure: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE")
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    campaign_payments: Mapped[list["CampaignPayment"]] = relationship("CampaignPayment", back_populates="campaign", cascade="all, delete-orphan")


class CampaignPayment(Base):
    __tablename__ = "campaign_payments"

    campaign_id: Mapped[str] = mapped_column(String(50), ForeignKey("attack_campaigns.id"), primary_key=True)
    payment_id: Mapped[str] = mapped_column(String(50), ForeignKey("payments.id"), primary_key=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["AttackCampaign"] = relationship("AttackCampaign", back_populates="campaign_payments")
    payment: Mapped["Payment"] = relationship("Payment", back_populates="campaign_payments")
