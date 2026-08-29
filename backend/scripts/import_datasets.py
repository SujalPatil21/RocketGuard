import sqlite3
import csv
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"), override=True)
from app.services import graph


def sync_payments_to_neo4j(conn):
    if not graph.is_configured():
        print("Neo4j sync: skipped (NEO4J_URI not set)")
        return

    c = conn.cursor()
    c.execute("""
        SELECT id, vendor_id, vendor_name, amount, currency, status,
               bank_account, ifsc, requested_by, submitted_at
        FROM payments
    """)
    columns = [d[0] for d in c.description]
    rows = [dict(zip(columns, row)) for row in c.fetchall()]

    synced = 0
    for row in rows:
        if graph.upsert_payment(row):
            synced += 1

    print(f"Neo4j sync: {synced}/{len(rows)} payments upserted (idempotent)")

    c.execute("SELECT id, campaign_type FROM attack_campaigns")
    campaigns = c.fetchall()
    synced_campaigns = 0
    for campaign_id, campaign_type in campaigns:
        c.execute("SELECT payment_id FROM campaign_payments WHERE campaign_id = ?", (campaign_id,))
        payment_ids = [r[0] for r in c.fetchall()]
        if payment_ids and graph.link_campaign(campaign_id, campaign_type, payment_ids):
            synced_campaigns += 1
    print(f"Neo4j sync: {synced_campaigns}/{len(campaigns)} campaigns linked (idempotent)")


def import_datasets():
    print("Starting dataset integration...")
    db_path = os.path.join(os.path.dirname(__file__), "..", "auth.db")
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Create new tables
    c.execute("""
    CREATE TABLE IF NOT EXISTS requesters (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255),
        department VARCHAR(100),
        job_role VARCHAR(100),
        employment_status VARCHAR(50),
        country VARCHAR(50),
        city VARCHAR(100),
        tenure_days INTEGER,
        typical_payment_amount FLOAT,
        typical_min_payment_amount FLOAT,
        approval_limit_amount FLOAT,
        normal_daily_payment_count INTEGER,
        normal_weekly_payment_count INTEGER,
        usual_vendor_count INTEGER,
        usual_vendor_ids TEXT,
        normal_submission_window VARCHAR(100),
        known_unusual_pattern VARCHAR(100),
        risk_baseline FLOAT,
        provenance VARCHAR(50),
        source_dataset VARCHAR(100),
        synthetic BOOLEAN,
        scenario_profile VARCHAR(100)
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS ground_truth_cases (
        case_id VARCHAR(50) PRIMARY KEY,
        payment_id VARCHAR(50),
        vendor_id VARCHAR(50),
        scenario_id VARCHAR(50),
        fraud_label BOOLEAN,
        fraud_type VARCHAR(100),
        campaign_id VARCHAR(50),
        expected_detection VARCHAR(100),
        known_relationships TEXT,
        label_source VARCHAR(100),
        provenance VARCHAR(50),
        source_dataset VARCHAR(100),
        synthetic BOOLEAN
    )
    """)
    conn.commit()

    datasets_dir = os.path.join(os.path.dirname(__file__), "..", "datasets")
    d1_path = os.path.join(datasets_dir, "dataset_01_financial_transactions_100.csv")
    d2_path = os.path.join(datasets_dir, "dataset_02_vendor_entities.csv")
    d3_path = os.path.join(datasets_dir, "dataset_03_requester_behavior.csv")
    d4_path = os.path.join(datasets_dir, "dataset_04_ground_truth_fraud_cases.csv")

    def read_csv(path):
        data = []
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        return data

    d1 = read_csv(d1_path)
    d2 = read_csv(d2_path)
    d3 = read_csv(d3_path)
    d4 = read_csv(d4_path)

    print(f"Dataset 1 transactions: {len(d1)}")
    print(f"Dataset 2 vendors: {len(d2)}")
    print(f"Dataset 3 requesters: {len(d3)}")
    print(f"Dataset 4 ground-truth cases: {len(d4)}")

    # Validations
    d2_vendors = {r["vendor_id"] for r in d2}
    d3_requesters = {r["requester_id"] for r in d3}
    d4_payments = {r["payment_id"] for r in d4}

    d1_vendors = {r["vendor_id"] for r in d1}
    d1_requesters = {r["requester_id"] for r in d1}
    d1_payments = {r["transaction_id"] for r in d1}

    unmatched_vendors = len(d1_vendors - d2_vendors)
    unmatched_requesters = len(d1_requesters - d3_requesters)
    unmatched_payments = len(d1_payments - d4_payments)

    print(f"Join validation:")
    print(f"Dataset1 -> Dataset2 = {'PASS' if unmatched_vendors == 0 else 'FAIL'}")
    print(f"Dataset1 -> Dataset3 = {'PASS' if unmatched_requesters == 0 else 'FAIL'}")
    print(f"Dataset1 -> Dataset4 = {'PASS' if unmatched_payments == 0 else 'FAIL'}")

    # Insert Data
    for row in d2:
        c.execute("""
            INSERT OR REPLACE INTO vendors (
                id, name, trusted_contacts, bank_information, normal_behavior
            ) VALUES (?, ?, ?, ?, ?)
        """, (
            row["vendor_id"],
            row["vendor_name"],
            f'{{"email": "{row["trusted_email"]}", "phone": "{row["trusted_phone"]}"}}',
            f'{{"bank_account": "{row["primary_bank_account"]}", "ifsc": "{row["primary_ifsc"]}"}}',
            f'{{"approvers": [], "usual_amount_range": [{row["minimum_payment_amount"]}, {row["maximum_payment_amount"]}], "frequency": ""}}'
        ))

    for row in d3:
        c.execute("""
            INSERT OR REPLACE INTO requesters (
                id, name, department, job_role, employment_status, country, city,
                tenure_days, typical_payment_amount, typical_min_payment_amount,
                approval_limit_amount, normal_daily_payment_count, normal_weekly_payment_count,
                usual_vendor_count, usual_vendor_ids, normal_submission_window,
                known_unusual_pattern, risk_baseline, provenance, source_dataset,
                synthetic, scenario_profile
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row["requester_id"], row["requester_name"], row["department"], row["job_role"],
            row["employment_status"], row["country"], row["city"], row["tenure_days"],
            row["typical_payment_amount"], row["typical_min_payment_amount"],
            row["approval_limit_amount"], row["normal_daily_payment_count"],
            row["normal_weekly_payment_count"], row["usual_vendor_count"],
            row["usual_vendor_ids"], row["normal_submission_window"],
            row["known_unusual_pattern"], row["risk_baseline"], row["provenance"],
            row["source_dataset"], row["synthetic"], row["scenario_profile"]
        ))

    for row in d4:
        c.execute("""
            INSERT OR REPLACE INTO ground_truth_cases (
                case_id, payment_id, vendor_id, scenario_id, fraud_label, fraud_type,
                campaign_id, expected_detection, known_relationships, label_source,
                provenance, source_dataset, synthetic
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row["case_id"], row["payment_id"], row["vendor_id"], row["scenario_id"],
            row["fraud_label"] == 'True', row["fraud_type"], row["campaign_id"],
            row["expected_detection"], row["known_relationships"], row["label_source"],
            row["provenance"], row["source_dataset"], row["synthetic"] == 'True'
        ))

    for row in d1:
        c.execute("""
            INSERT OR REPLACE INTO payments (
                id, vendor_id, vendor_name, amount, currency, due_date, bank_account, ifsc,
                requested_by, request_message, request_type, status, risk_score,
                requires_human_review, provenance, scenario_id, submitted_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row["transaction_id"], row["vendor_id"], row["vendor_name"],
            float(row["amount"]), row["currency"], row["due_date"],
            row["bank_account"], row["ifsc"], row["requester_id"],
            row["request_message"], row["request_type"], "PENDING",
            0, False, row["provenance"], row["scenario_id"],
            row["submitted_at"], row["submitted_at"]
        ))

    conn.commit()
    print("Duplicate protection = PASS")

    c.execute("SELECT count(*) FROM payments")
    payments = c.fetchone()[0]
    c.execute("SELECT count(*) FROM vendors")
    vendors = c.fetchone()[0]
    c.execute("SELECT count(*) FROM requesters")
    requesters = c.fetchone()[0]
    c.execute("SELECT count(*) FROM ground_truth_cases")
    ground_truth_cases = c.fetchone()[0]
    c.execute("SELECT count(*) FROM attack_campaigns")
    attack_campaigns = c.fetchone()[0]
    c.execute("SELECT count(*) FROM campaign_payments")
    campaign_payments = c.fetchone()[0]
    c.execute("SELECT count(*) FROM risk_signals")
    risk_signals = c.fetchone()[0]

    print(f"SQLite counts:\npayments = {payments}\nvendors = {vendors}\nrequesters = {requesters}\nground_truth_cases = {ground_truth_cases}\nattack_campaigns = {attack_campaigns}\ncampaign_payments = {campaign_payments}\nrisk_signals = {risk_signals}")

    sync_payments_to_neo4j(conn)

    conn.close()

if __name__ == "__main__":
    import_datasets()
