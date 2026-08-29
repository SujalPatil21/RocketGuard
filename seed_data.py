import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add project root to sys.path so app imports work
project_root = Path(__file__).resolve().parent
sys.path.append(str(project_root / "backend"))

from app.db.database import SessionLocal, create_tables, engine  # type: ignore[import]
from app.models.fraud import Vendor, Payment, Base, RiskSignal, AttackCampaign, CampaignPayment  # type: ignore[import]
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

def load_demo_payments(session):
    # Insert exactly the 10 records requested by the user
    sql = text("""
    INSERT INTO payments (
        id,
        vendor_id,
        vendor_name,
        amount,
        currency,
        due_date,
        bank_account,
        ifsc,
        requested_by,
        request_message,
        request_type,
        status,
        risk_score,
        requires_human_review,
        provenance,
        scenario_id,
        submitted_at,
        created_at
    ) VALUES
    (
        'PAY-IN-001', 'VND-IN-001', 'Aarav Industrial Solutions Pvt Ltd',
        48500.00, 'INR', '2026-09-05', '203456789012', 'HDFC0001234',
        'Priya Nair', 'Monthly maintenance invoice for production equipment.',
        'INVOICE', 'PENDING', 12, 0, 'synthetic', 'legitimate',
        '2026-08-29T09:10:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-002', 'VND-IN-002', 'Bharat Office Systems Pvt Ltd',
        32750.00, 'INR', '2026-09-07', '304567890123', 'ICIC0002345',
        'Rohan Mehta', 'Quarterly office equipment and supplies purchase.',
        'PURCHASE', 'PENDING', 9, 0, 'synthetic', 'legitimate',
        '2026-08-29T09:15:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-003', 'VND-IN-003', 'Mehta Engineering Works',
        76200.00, 'INR', '2026-09-10', '415678901234', 'SBIN0003456',
        'Ananya Iyer', 'Approved engineering services for August project work.',
        'SERVICE', 'PENDING', 15, 0, 'synthetic', 'legitimate',
        '2026-08-29T09:20:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-004', 'VND-IN-004', 'Sharma Digital Services Pvt Ltd',
        185000.00, 'INR', '2026-08-31', 'BAD8888', 'AXIS0004567',
        'Vikram Sharma', 'Urgent invoice settlement requested before month end.',
        'URGENT_PAYMENT', 'PENDING', 78, 1, 'synthetic', 'scenario_3',
        '2026-08-29T09:25:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-005', 'VND-IN-005', 'Nair Infrastructure Solutions',
        214500.00, 'INR', '2026-08-31', 'BAD8888', 'AXIS0004567',
        'Vikram Sharma', 'Payment requested for expedited infrastructure work.',
        'URGENT_PAYMENT', 'PENDING', 84, 1, 'synthetic', 'scenario_3',
        '2026-08-29T09:27:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-006', 'VND-IN-006', 'Patel Business Technologies',
        167800.00, 'INR', '2026-09-01', 'BAD8888', 'AXIS0004567',
        'Vikram Sharma', 'Vendor payment requested using updated beneficiary details.',
        'BANK_CHANGE', 'PENDING', 91, 1, 'synthetic', 'scenario_3',
        '2026-08-29T09:29:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-007', 'VND-IN-007', 'Reddy Logistics & Trading',
        192300.00, 'INR', '2026-09-01', 'BAD8888', 'AXIS0004567',
        'Vikram Sharma', 'Immediate settlement requested for outstanding logistics invoice.',
        'URGENT_PAYMENT', 'PENDING', 95, 1, 'synthetic', 'scenario_3',
        '2026-08-29T09:31:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-008', 'VND-IN-008', 'Joshi Consulting Services',
        143750.00, 'INR', '2026-09-02', '509876543210', 'HDFC0005678',
        'Karan Joshi', 'Invoice received from vendor with revised payment instructions.',
        'INVOICE', 'PENDING', 72, 1, 'synthetic', 'scenario_2',
        '2026-08-29T09:35:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-009', 'VND-IN-009', 'RocketRide India Solutions Pvt Ltd',
        96500.00, 'INR', '2026-09-04', '618765432109', 'ICIC0006789',
        'Neha Kapoor', 'Cloud intelligence and workflow automation services.',
        'SERVICE', 'PENDING', 18, 0, 'synthetic', 'legitimate',
        '2026-08-29T09:40:00', CURRENT_TIMESTAMP
    ),
    (
        'PAY-IN-010', 'VND-IN-010', 'Verma Enterprise Systems',
        238900.00, 'INR', '2026-09-01', 'BAD8888', 'AXIS0004567',
        'Vikram Sharma', 'High-priority vendor settlement requested with beneficiary confirmation.',
        'BANK_CHANGE', 'PENDING', 97, 1, 'synthetic', 'scenario_3',
        '2026-08-29T09:33:00', CURRENT_TIMESTAMP
    )
    """)
    session.execute(sql)

def seed():
    # Only clear demo data, keep users/auth intact
    create_tables()
    db = SessionLocal()
    try:
        # Models imported at top of file
        # Delete only demo campaign payments
        db.query(CampaignPayment).filter(CampaignPayment.payment_id.like("PAY-IN-%")).delete(synchronize_session=False)
        # We also need to delete any campaigns that might become orphaned, but it's simpler to delete all campaigns, or just leave campaigns alone since they will be recreated
        # Actually, let's just delete demo-related risk signals and payments
        db.query(RiskSignal).filter(RiskSignal.payment_id.like("PAY-IN-%")).delete(synchronize_session=False)
        db.query(Payment).filter(Payment.id.like("PAY-IN-%")).delete(synchronize_session=False)
        db.query(Vendor).filter(Vendor.id.like("VND-IN-%")).delete(synchronize_session=False)
        
        # It's safe to clear campaigns since they are dynamically generated every batch run
        # Wait, if we keep expanded mode, we want to keep expanded campaigns!
        # So let's delete campaigns that ONLY contain demo payments. 
        # For simplicity, we can just delete all campaigns that have demo payments.
        # Actually, the user says "Resetting Demo must NOT delete the expanded dataset."
        # Campaigns are part of the intelligence state. 
        db.commit()
        load_vendors(db)
        load_demo_payments(db)
        db.commit()
        print("Database seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
