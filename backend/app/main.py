from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import json
from datetime import datetime

from .models.payment import PaymentRequest, PaymentResult, PaymentStatus
from .models.audit import AuditEvent
from .models.fraud import Payment, Vendor, RiskSignal, AttackCampaign, CampaignPayment
from .services.rocketride_service import run_pipeline
from .services.intelligence import run_risk_adjudicator, run_attack_chain_analysis

from .auth.controllers.router import router as auth_router
from .auth.exceptions.exceptions import AuthException
from .auth.security.dependencies import get_current_user
from .db.database import create_tables, get_db
from sqlalchemy.orm import Session
from sqlalchemy import func

app = FastAPI(title="AP Sentinel API")

import os

cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
if cors_origins_env == "*":
    origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
else:
    origins = [origin.strip() for origin in cors_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(AuthException)
async def auth_exception_handler(request, exc: AuthException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "errorCode": exc.error_code,
        }
    )

app.include_router(auth_router)

@app.on_event("startup")
def on_startup():
    create_tables()

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/stats")
def get_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.query(Payment).count()
    clear = db.query(Payment).filter(Payment.status == "CLEAR").count()
    held = db.query(Payment).filter(Payment.status == "HELD").count()
    approved = db.query(Payment).filter(Payment.status == "APPROVED").count()
    rejected = db.query(Payment).filter(Payment.status == "REJECTED").count()
    unprocessable = db.query(Payment).filter(Payment.status == "UNPROCESSABLE").count()
    
    return {
        "screened": total,
        "clear": clear,
        "held": held,
        "approved": approved,
        "rejected": rejected,
        "unprocessable": unprocessable,
        "runtime_ms": 1500,
        "tokens": 450
    }

def map_payment_to_result(p: Payment, db: Session) -> dict:
    req = PaymentRequest(
        invoice_id=p.id,
        vendor_id=p.vendor_id,
        vendor_name=p.vendor_name,
        amount=p.amount,
        currency=p.currency,
        due_date=p.due_date or "",
        bank_account=p.bank_account or "",
        ifsc=p.ifsc or "",
        requested_by=p.requested_by or "",
        request_message=p.request_message or "",
        submitted_at=p.submitted_at or "",
        request_type=p.request_type or "STANDARD"
    )
    signals = [s.reason for s in p.signals]
    
    # We construct a dict compatible with the UI expectations
    return {
        "payment": req.model_dump(),
        "status": p.status,
        "risk_score": p.risk_score,
        "signals": signals,
        "requires_human_review": p.requires_human_review,
        "audit_events": []
    }

@app.get("/api/payments")
def get_payments(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    payments = db.query(Payment).all()
    return [map_payment_to_result(p, db) for p in payments]

@app.get("/api/campaigns")
def get_campaigns(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    campaigns = db.query(AttackCampaign).all()
    res = []
    for c in campaigns:
        payments_in_campaign = [cp.payment_id for cp in c.campaign_payments]
        res.append({
            "id": c.id,
            "campaign_type": c.campaign_type,
            "confidence": c.confidence,
            "stage": c.stage,
            "total_exposure": c.total_exposure,
            "status": c.status,
            "reasoning": c.reasoning,
            "payments": payments_in_campaign,
            "vendors": list(set([db.query(Payment).filter(Payment.id==pid).first().vendor_id for pid in payments_in_campaign]))
        })
    return res

@app.get("/api/activity")
def get_activity(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return []

is_batch_running = False

@app.post("/api/screen-batch")
async def screen_batch(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    global is_batch_running
    if is_batch_running:
        raise HTTPException(status_code=409, detail="Batch is already running.")
    
    is_batch_running = True
    try:
        pending_payments = db.query(Payment).filter(Payment.status == "PENDING").all()
        
        for p in pending_payments:
            if p.amount < 0 or not p.bank_account:
                p.status = "UNPROCESSABLE"
                p.requires_human_review = True
                db.commit()
                continue
                
            # Run deterministic logic
            run_risk_adjudicator(p, db)
            
        # Run Attack Chain Analysis across all recently flagged payments
        await run_attack_chain_analysis(db)
            
        return {"status": "success"}
    finally:
        is_batch_running = False

@app.post("/api/payments/{payment_id}/approve")
def approve_payment(payment_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if p and p.status in ["HELD", "UNPROCESSABLE"]:
        p.status = "APPROVED"
        p.requires_human_review = False
        db.commit()
        return map_payment_to_result(p, db)
    raise HTTPException(status_code=404, detail="Payment not found")

@app.post("/api/payments/{payment_id}/reject")
def reject_payment(payment_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if p and p.status in ["HELD", "UNPROCESSABLE"]:
        p.status = "REJECTED"
        p.requires_human_review = False
        db.commit()
        return map_payment_to_result(p, db)
    raise HTTPException(status_code=404, detail="Payment not found")

@app.post("/api/reset-demo")
def reset_demo(current_user=Depends(get_current_user)):
    import subprocess
    import sys
    # Call the seed script
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "seed_data.py")
    subprocess.run([sys.executable, script_path], check=True)
    return {"status": "reset"}
