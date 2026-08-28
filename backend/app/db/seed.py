import json
import os
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine, Base
from app.models.fraud import Vendor, Payment, RiskSignal, AttackCampaign, CampaignPayment
import uuid
from datetime import datetime, timezone

def generate_synthetic_data(db: Session):
    # Load JSON files
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    data_dir = os.path.join(project_root, "data")
    
    with open(os.path.join(data_dir, "vendors.json"), "r") as f:
        vendors_data = json.load(f)
        
    for v_data in vendors_data:
        v = Vendor(
            id=v_data["vendor_id"],
            name=v_data["vendor_name"],
            trusted_contacts=json.dumps({
                "phone": v_data.get("trusted_phone"), 
                "email": v_data.get("trusted_email")
            }),
            bank_information=json.dumps({
                "account": v_data.get("bank_account"), 
                "ifsc": v_data.get("ifsc")
            }),
            normal_behavior=json.dumps({
                "approvers": v_data.get("usual_approvers"), 
                "amount_range": v_data.get("usual_amount_range"), 
                "frequency": v_data.get("payment_frequency")
            })
        )
        db.merge(v)
        
    db.commit()

    with open(os.path.join(data_dir, "payments.json"), "r") as f:
        payments_data = json.load(f)
        
    for p_data in payments_data:
        p = Payment(
            id=p_data["invoice_id"],
            vendor_id=p_data["vendor_id"],
            vendor_name=p_data["vendor_name"],
            amount=p_data.get("amount", 0.0),
            currency=p_data.get("currency", "USD"),
            due_date=p_data.get("due_date"),
            bank_account=p_data.get("bank_account"),
            ifsc=p_data.get("ifsc"),
            requested_by=p_data.get("requested_by"),
            request_message=p_data.get("request_message"),
            submitted_at=p_data.get("submitted_at"),
            request_type=p_data.get("request_type", "STANDARD")
        )
        db.merge(p)
        
    db.commit()
    
    # Generate Synthetic Coordinated Attack Data
    # 1. New Vendor for the shell company
    shell_vendor = Vendor(
        id="V-9999",
        name="[SYNTHETIC] Offshore Shell",
        trusted_contacts=json.dumps({"phone": "+1-555-0999", "email": "anon@offshore.com"}),
        bank_information=json.dumps({"account": "99999132", "ifsc": "UNKN0001"}), # Same bank account as the fraud payment in JSON
        normal_behavior=json.dumps({"approvers": ["Eve"], "amount_range": [0, 1000000], "frequency": "Random"})
    )
    db.merge(shell_vendor)
    db.commit()
    
    # 2. Add extra payments to create a clear coordinated attack
    synthetic_payments = [
        # Attack Payment 2: Rapid escalation on V-1002 but sharing the fake bank account
        Payment(
            id="INV-021-SYNTHETIC", vendor_id="V-1002", vendor_name="Global Tech Logistics", amount=195000.0, currency="USD",
            due_date="2026-08-26", bank_account="99999132", ifsc="UNKN0001", requested_by="CEO",
            request_message="URGENT \u2014 new vendor routing, send wire immediately.",
            submitted_at="2026-08-26T10:18:00Z", request_type="WIRE"
        ),
        # Attack Payment 3: Offshore shell using the same bank account
        Payment(
            id="INV-022-SYNTHETIC", vendor_id="V-9999", vendor_name="[SYNTHETIC] Offshore Shell", amount=250000.0, currency="USD",
            due_date="2026-08-26", bank_account="99999132", ifsc="UNKN0001", requested_by="Eve",
            request_message="Consulting fees expedited.",
            submitted_at="2026-08-26T10:20:00Z", request_type="WIRE"
        )
    ]
    
    for p in synthetic_payments:
        db.merge(p)
    db.commit()


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Clear existing tables for a clean slate
        db.query(CampaignPayment).delete()
        db.query(AttackCampaign).delete()
        db.query(RiskSignal).delete()
        db.query(Payment).delete()
        db.query(Vendor).delete()
        db.commit()

        generate_synthetic_data(db)
        print("Database successfully seeded with JSON data and synthetic fraud scenarios!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
