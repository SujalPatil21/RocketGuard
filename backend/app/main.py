from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import json
from datetime import datetime

from .models.payment import PaymentRequest, PaymentResult, PaymentStatus
from .models.audit import AuditEvent
from .services.rocketride_service import run_pipeline

# ── Auth imports ──────────────────────────────────────────────────────────────
from .auth.controllers.router import router as auth_router
from .auth.exceptions.exceptions import AuthException
from .auth.security.dependencies import get_current_user
from .db.database import create_tables

app = FastAPI(title="AP Sentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth exception handler ────────────────────────────────────────────────────
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

# ── Mount auth router ─────────────────────────────────────────────────────────
app.include_router(auth_router)

# ── Create DB tables on startup ───────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    create_tables()

# ── In-memory AP Sentinel state (unchanged) ───────────────────────────────────
demo_state = {
    "payments": [],
    "stats": {
        "screened": 0,
        "clear": 0,
        "held": 0,
        "approved": 0,
        "rejected": 0,
        "unprocessable": 0,
        "runtime_ms": 0,
        "tokens": 0
    }
}

def load_initial_data():
    try:
        with open("../data/payments.json", "r") as f:
            payments_data = json.load(f)
            demo_state["payments"] = []
            for p_data in payments_data:
                req = PaymentRequest(**p_data)
                res = PaymentResult(payment=req)
                res.audit_events.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "type": "PAYMENT_RECEIVED",
                    "message": "Payment request received."
                })
                demo_state["payments"].append(res)
    except Exception as e:
        print("Failed to load data:", e)

load_initial_data()

# ── Public routes ─────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok"}

# ── Protected routes (require valid JWT) ──────────────────────────────────────
@app.get("/api/stats")
def get_stats(current_user=Depends(get_current_user)):
    return demo_state["stats"]

@app.get("/api/payments")
def get_payments(current_user=Depends(get_current_user)):
    return [p.model_dump() for p in demo_state["payments"]]

is_batch_running = False

@app.post("/api/screen-batch")
async def screen_batch(current_user=Depends(get_current_user)):
    global is_batch_running
    if is_batch_running:
        raise HTTPException(status_code=409, detail="Batch is already running.")
    
    is_batch_running = True
    try:
        for payment_res in demo_state["payments"]:
            if payment_res.status != PaymentStatus.PENDING:
                continue
                
            req = payment_res.payment
            
            # Check unprocessable
            if req.amount == "TBD" or not req.bank_account:
                payment_res.status = PaymentStatus.UNPROCESSABLE
                payment_res.requires_human_review = True
                demo_state["stats"]["unprocessable"] += 1
                demo_state["stats"]["screened"] += 1
                payment_res.audit_events.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "type": "UNPROCESSABLE",
                    "message": "Malformed payment record."
                })
                continue

            # Execute Real RocketRide Pipeline
            try:
                result = await run_pipeline("../../rocketride/ap_sentinel.pipe", {"payment": req.model_dump()})
                
                demo_state["stats"]["screened"] += 1
                
                payment_res.history_checker_result = result
                
                ai_status = result.get("status", "UNPROCESSABLE")
                payment_res.risk_score = result.get("riskScore", 0)
                payment_res.signals = result.get("signals", [])
                
                if ai_status == "FLAG":
                    payment_res.status = PaymentStatus.HELD
                    payment_res.requires_human_review = True
                    demo_state["stats"]["held"] += 1
                elif ai_status == "UNPROCESSABLE":
                    payment_res.status = PaymentStatus.UNPROCESSABLE
                    payment_res.requires_human_review = True
                    demo_state["stats"]["unprocessable"] += 1
                elif ai_status == "CLEAR":
                    payment_res.status = PaymentStatus.CLEAR
                    payment_res.requires_human_review = False
                    demo_state["stats"]["clear"] += 1
                else:
                    payment_res.status = PaymentStatus.HELD
                    payment_res.requires_human_review = True
                    demo_state["stats"]["held"] += 1
                    
            except Exception as e:
                # Fallback handling for pipeline failure
                payment_res.status = PaymentStatus.HELD
                payment_res.requires_human_review = True
                demo_state["stats"]["held"] += 1
                payment_res.audit_events.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "type": "PIPELINE_ERROR",
                    "message": str(e)
                })
                
        return {"status": "success", "stats": demo_state["stats"]}
    finally:
        is_batch_running = False

@app.post("/api/payments/{payment_id}/approve")
def approve_payment(payment_id: str, current_user=Depends(get_current_user)):
    for p in demo_state["payments"]:
        if p.payment.invoice_id == payment_id:
            if p.status == PaymentStatus.HELD or p.status == PaymentStatus.UNPROCESSABLE:
                p.status = PaymentStatus.APPROVED
                p.requires_human_review = False
                demo_state["stats"]["approved"] += 1
                demo_state["stats"]["held"] -= 1 if p.status == PaymentStatus.HELD else 0
                p.audit_events.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "type": "PAYMENT_APPROVED",
                    "message": "Payment approved by human reviewer."
                })
                return p.model_dump()
    raise HTTPException(status_code=404, detail="Payment not found")

@app.post("/api/payments/{payment_id}/reject")
def reject_payment(payment_id: str, current_user=Depends(get_current_user)):
    for p in demo_state["payments"]:
        if p.payment.invoice_id == payment_id:
            if p.status == PaymentStatus.HELD or p.status == PaymentStatus.UNPROCESSABLE:
                p.status = PaymentStatus.REJECTED
                p.requires_human_review = False
                demo_state["stats"]["rejected"] += 1
                demo_state["stats"]["held"] -= 1 if p.status == PaymentStatus.HELD else 0
                p.audit_events.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "type": "PAYMENT_REJECTED",
                    "message": "Payment rejected by human reviewer."
                })
                return p.model_dump()
    raise HTTPException(status_code=404, detail="Payment not found")

@app.post("/api/reset-demo")
def reset_demo(current_user=Depends(get_current_user)):
    demo_state["stats"] = {
        "screened": 0, "clear": 0, "held": 0, "approved": 0, "rejected": 0, "unprocessable": 0,
        "runtime_ms": 0, "tokens": 0
    }
    load_initial_data()
    return {"status": "reset"}
