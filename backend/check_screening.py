import os
import asyncio
from typing import Dict, Any
from app.services.rocketride_service import run_pipeline

async def test_screening():
    payment_data = {
        "payment": {
            "invoice_id": "TEST-123",
            "vendor_name": "Test Vendor",
            "amount": 150000,
            "currency": "INR",
            "bank_account": "XXXX9999",
            "ifsc": "ABCD0001234",
            "requested_by": "Finance Ops",
            "request_message": "Urgent",
            "due_date": "2026-09-01",
            "request_type": "VENDOR"
        }
    }
    
    pipe_path = "../../rocketride/ap_sentinel.pipe"
    print("Running pipeline...")
    result = await run_pipeline(pipe_path, payment_data)
    print("Pipeline result:", result)

asyncio.run(test_screening())
