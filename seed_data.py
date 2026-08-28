import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add project root to sys.path so app imports work
project_root = Path(__file__).resolve().parent
sys.path.append(str(project_root / "backend"))

from app.db.database import SessionLocal, create_tables, engine
from app.models.fraud import Vendor, Payment, Base
from sqlalchemy import text

def load_vendors(session):
    with open(project_root / "data" / "vendors.json", "r") as f:
        data = json.load(f)
    for v_data in data:
        vendor = Vendor(
            id=v_data.get("vendor_id"),
            name=v_data.get("vendor_name"),
            trusted_contacts=json.dumps({"phone": v_data.get("trusted_phone"), "email": v_data.get("trusted_email")}),
            bank_information=json.dumps({"bank_account": v_data.get("bank_account"), "ifsc": v_data.get("ifsc")}),
            normal_behavior=json.dumps({"usual_approvers": v_data.get("usual_approvers"), "usual_amount_range": v_data.get("usual_amount_range")})
        )
        session.merge(vendor)

def load_existing_payments(session):
    with open(project_root / "data" / "payments.json", "r") as f:
        data = json.load(f)
    for p_data in data:
        amount = p_data.get("amount")
        if isinstance(amount, str):
            if amount.isdigit() or amount.replace('.', '', 1).isdigit():
                amount = float(amount)
            else:
                amount = -1.0
        
        payment = Payment(
            id=p_data.get("invoice_id"),
            vendor_id=p_data.get("vendor_id"),
            vendor_name=p_data.get("vendor_name"),
            amount=amount,
            currency=p_data.get("currency", "USD"),
            due_date=p_data.get("due_date"),
            bank_account=p_data.get("bank_account"),
            ifsc=p_data.get("ifsc"),
            requested_by=p_data.get("requested_by"),
            request_message=p_data.get("request_message"),
            request_type=p_data.get("request_type"),
            submitted_at=p_data.get("submitted_at"),
            provenance="EXISTING_SEED"
        )
        session.merge(payment)

def generate_synthetic_data(session):
    base_time = datetime.utcnow()
    
    # Ensure vendor for synthetic data exists
    v_synth1 = Vendor(
        id="V-SYNTH-1", name="Global Cloud Infra",
        trusted_contacts=json.dumps({"email": "billing@globalcloud.com"}),
        bank_information=json.dumps({"bank_account": "10203040", "ifsc": "GLB0001"}),
        normal_behavior=json.dumps({"usual_amount_range": [1000, 5000]})
    )
    v_synth2 = Vendor(
        id="V-SYNTH-2", name="Nexus Hardware",
        trusted_contacts=json.dumps({"email": "sales@nexus.com"}),
        bank_information=json.dumps({"bank_account": "50607080", "ifsc": "NEX0002"}),
        normal_behavior=json.dumps({"usual_amount_range": [5000, 20000]})
    )
    session.merge(v_synth1)
    session.merge(v_synth2)

    # SCENARIO 1: Legitimate
    p1 = Payment(
        id="SYN-L1", vendor_id="V-SYNTH-1", vendor_name="Global Cloud Infra",
        amount=2500.0, currency="USD", bank_account="10203040", ifsc="GLB0001",
        requested_by="DevOps Team", request_message="Monthly cloud hosting",
        submitted_at=(base_time - timedelta(days=2)).isoformat() + "Z",
        provenance="SYNTHETIC_SCENARIO", scenario_id="SCENARIO_1_LEGIT"
    )
    session.merge(p1)

    # SCENARIO 2: Individual Fraud
    p2 = Payment(
        id="SYN-F1", vendor_id="V-SYNTH-1", vendor_name="Global Cloud Infra",
        amount=48000.0, currency="USD", bank_account="99991111", ifsc="FRA0009",
        requested_by="DevOps Team", request_message="URGENT: Outstanding balance required to prevent server shutdown",
        submitted_at=(base_time - timedelta(hours=5)).isoformat() + "Z",
        provenance="SYNTHETIC_SCENARIO", scenario_id="SCENARIO_2_FRAUD"
    )
    session.merge(p2)

    # SCENARIO 3: Coordinated Attack (4 Payments)
    # The attack relies on sharing a bank account, requester, close timing, amount escalation.
    
    t1 = base_time - timedelta(hours=2)
    p3 = Payment(
        id="SYN-A1", vendor_id="V-SYNTH-2", vendor_name="Nexus Hardware",
        amount=8000.0, currency="USD", bank_account="BAD8888", ifsc="BAD001",
        requested_by="J. Smith (Contractor)", request_message="Hardware batch 1",
        submitted_at=t1.isoformat() + "Z",
        provenance="SYNTHETIC_SCENARIO", scenario_id="SCENARIO_3_ATTACK"
    )
    
    t2 = t1 + timedelta(minutes=15)
    p4 = Payment(
        id="SYN-A2", vendor_id="V-SYNTH-2", vendor_name="Nexus Hardware",
        amount=15000.0, currency="USD", bank_account="BAD8888", ifsc="BAD001",
        requested_by="J. Smith (Contractor)", request_message="Hardware batch 2 expedited",
        submitted_at=t2.isoformat() + "Z",
        provenance="SYNTHETIC_SCENARIO", scenario_id="SCENARIO_3_ATTACK"
    )

    t3 = t2 + timedelta(minutes=12)
    p5 = Payment(
        id="SYN-A3", vendor_id="V-SYNTH-1", vendor_name="Global Cloud Infra",
        amount=45000.0, currency="USD", bank_account="BAD8888", ifsc="BAD001",
        requested_by="J. Smith (Contractor)", request_message="Cloud reserve purchase",
        submitted_at=t3.isoformat() + "Z",
        provenance="SYNTHETIC_SCENARIO", scenario_id="SCENARIO_3_ATTACK"
    )
    
    t4 = t3 + timedelta(minutes=8)
    p6 = Payment(
        id="SYN-A4", vendor_id="V-1002", vendor_name="Global Tech Logistics", # Existing vendor
        amount=95000.0, currency="USD", bank_account="BAD8888", ifsc="BAD001",
        requested_by="J. Smith (Contractor)", request_message="Emergency freight clearance",
        submitted_at=t4.isoformat() + "Z",
        provenance="SYNTHETIC_SCENARIO", scenario_id="SCENARIO_3_ATTACK"
    )

    session.merge(p3)
    session.merge(p4)
    session.merge(p5)
    session.merge(p6)

def seed():
    # Only clear demo data, keep users/auth intact
    create_tables()
    db = SessionLocal()
    try:
        from app.models.fraud import Payment, Vendor, RiskSignal, AttackCampaign, CampaignPayment
        db.query(CampaignPayment).delete()
        db.query(AttackCampaign).delete()
        db.query(RiskSignal).delete()
        db.query(Payment).delete()
        db.query(Vendor).delete()
        db.commit()
        load_vendors(db)
        load_existing_payments(db)
        generate_synthetic_data(db)
        db.commit()
        print("Database seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
