import json

vendors = [
    {
        "vendor_id": "V-1001",
        "vendor_name": "Acme Supplies",
        "trusted_phone": "+1-555-0101",
        "trusted_email": "billing@acmesupplies.com",
        "bank_account": "88880001",
        "ifsc": "ACME0001",
        "usual_approvers": ["John Doe", "Jane Smith"],
        "usual_amount_range": [1000, 50000],
        "currency": "USD",
        "payment_frequency": "Monthly"
    },
    {
        "vendor_id": "V-1002",
        "vendor_name": "Global Tech Logistics",
        "trusted_phone": "+1-555-0102",
        "trusted_email": "finance@globaltechlog.com",
        "bank_account": "88880002",
        "ifsc": "GLOB0002",
        "usual_approvers": ["Alice Johnson"],
        "usual_amount_range": [50000, 200000],
        "currency": "USD",
        "payment_frequency": "Weekly"
    },
    {
        "vendor_id": "V-1003",
        "vendor_name": "Skyline Design Partners",
        "trusted_phone": "+1-555-0103",
        "trusted_email": "invoicing@skylinedp.com",
        "bank_account": "88880003",
        "ifsc": "SKYL0003",
        "usual_approvers": ["Bob Williams"],
        "usual_amount_range": [500, 5000],
        "currency": "USD",
        "payment_frequency": "Bi-Weekly"
    }
]

payments = [
    # CASE A: Normal vendor, matching bank, normal amount (CLEAR)
    {
        "invoice_id": "INV-014",
        "vendor_id": "V-1001",
        "vendor_name": "Acme Supplies",
        "amount": 2400.00,
        "currency": "USD",
        "due_date": "2026-09-01",
        "bank_account": "88880001",
        "ifsc": "ACME0001",
        "requested_by": "John Doe",
        "request_message": "Monthly office supplies.",
        "submitted_at": "2026-08-26T10:00:00Z",
        "request_type": "STANDARD"
    },
    # CASE B: Bank account mismatch (HISTORY FLAG, HELD)
    {
        "invoice_id": "INV-015",
        "vendor_id": "V-1002",
        "vendor_name": "Global Tech Logistics",
        "amount": 75000.00,
        "currency": "USD",
        "due_date": "2026-09-02",
        "bank_account": "99990005", # Different
        "ifsc": "GLOB0002",
        "requested_by": "Alice Johnson",
        "request_message": "Weekly logistics fee. Please note our new bank account number.",
        "submitted_at": "2026-08-26T10:05:00Z",
        "request_type": "STANDARD"
    },
    # CASE C: Urgent request (PATTERN FLAG, HELD)
    {
        "invoice_id": "INV-016",
        "vendor_id": "V-1003",
        "vendor_name": "Skyline Design Partners",
        "amount": 4500.00,
        "currency": "USD",
        "due_date": "2026-08-26",
        "bank_account": "88880003",
        "ifsc": "SKYL0003",
        "requested_by": "Bob Williams",
        "request_message": "URGENT: Please process today or service will be suspended immediately.",
        "submitted_at": "2026-08-26T10:10:00Z",
        "request_type": "EXPEDITED"
    },
    # CASE D: Vendor impersonation, New bank, Urgency, Abnormal amount (HIGH RISK, HELD)
    {
        "invoice_id": "INV-017",
        "vendor_id": "V-1001",
        "vendor_name": "Acmme Supplies", # Typo impersonation
        "amount": 150000.00, # Abnormal amount
        "currency": "USD",
        "due_date": "2026-08-26",
        "bank_account": "12345678",
        "ifsc": "UNKN0001",
        "requested_by": "CEO",
        "request_message": "Highly confidential and urgent. Wire funds to the new account today. Do not call to verify.",
        "submitted_at": "2026-08-26T10:15:00Z",
        "request_type": "WIRE"
    },
    # CASE E: Agent Disagreement (History Clear, Pattern Flag)
    {
        "invoice_id": "INV-018",
        "vendor_id": "V-1003",
        "vendor_name": "Skyline Design Partners",
        "amount": 3500.00,
        "currency": "USD",
        "due_date": "2026-09-10",
        "bank_account": "88880003",
        "ifsc": "SKYL0003",
        "requested_by": "Bob Williams",
        "request_message": "Our systems were hacked, please use this temporary link to pay, though the bank account is the same, it's very urgent.",
        "submitted_at": "2026-08-26T10:20:00Z",
        "request_type": "STANDARD"
    },
    # CASE F: Malformed record (UNPROCESSABLE)
    {
        "invoice_id": "INV-019",
        "vendor_id": "V-1002",
        "vendor_name": "Global Tech Logistics",
        "amount": "TBD", # Invalid
        "currency": "USD",
        "due_date": "2026-09-02",
        "bank_account": "",
        "ifsc": "GLOB0002",
        "requested_by": "Alice Johnson",
        "request_message": "Missing info.",
        "submitted_at": "2026-08-26T10:25:00Z",
        "request_type": "STANDARD"
    }
]

# Generate more clear ones to pad it out to ~12 CLEAR
for i in range(20, 26):
    payments.append({
        "invoice_id": f"INV-0{i}",
        "vendor_id": "V-1001",
        "vendor_name": "Acme Supplies",
        "amount": 2000.00 + i * 10,
        "currency": "USD",
        "due_date": f"2026-09-{i-10:02d}",
        "bank_account": "88880001",
        "ifsc": "ACME0001",
        "requested_by": "John Doe",
        "request_message": "Standard invoice.",
        "submitted_at": f"2026-08-26T10:{i}:00Z",
        "request_type": "STANDARD"
    })

history = {
    "V-1001": [
        {"invoice_id": "INV-001", "amount": 2300, "date": "2026-07-01", "bank_account": "88880001"},
        {"invoice_id": "INV-005", "amount": 2500, "date": "2026-08-01", "bank_account": "88880001"}
    ],
    "V-1002": [
        {"invoice_id": "INV-002", "amount": 80000, "date": "2026-08-15", "bank_account": "88880002"}
    ],
    "V-1003": [
        {"invoice_id": "INV-003", "amount": 4000, "date": "2026-08-10", "bank_account": "88880003"}
    ]
}

with open("data/vendors.json", "w") as f:
    json.dump(vendors, f, indent=2)

with open("data/payment-history.json", "w") as f:
    json.dump(history, f, indent=2)

with open("data/payments.json", "w") as f:
    json.dump(payments, f, indent=2)
