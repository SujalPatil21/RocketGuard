import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.fraud import Payment, RiskSignal, AttackCampaign, CampaignPayment, Vendor
from app.services.rocketride_service import run_pipeline
import os

def run_risk_adjudicator(payment: Payment, db: Session):
    score = 0
    signals = []
    
    vendor = db.query(Vendor).filter(Vendor.id == payment.vendor_id).first()
    
    # Simple deterministic rules
    if vendor:
        try:
            bank_info = json.loads(vendor.bank_information or "{}")
            if bank_info.get("bank_account") and bank_info.get("bank_account") != payment.bank_account:
                score += 40
                signals.append("Beneficiary bank account does not match vendor profile.")
        except:
            pass
            
        try:
            behavior = json.loads(vendor.normal_behavior or "{}")
            rng = behavior.get("usual_amount_range")
            if rng and len(rng) == 2:
                if payment.amount > rng[1] * 1.5:
                    score += 30
                    signals.append(f"Amount {payment.amount} significantly exceeds normal range up to {rng[1]}.")
        except:
            pass
            
    if "URGENT" in (payment.request_message or "").upper() or "EXPEDITED" in (payment.request_message or "").upper():
        score += 20
        signals.append("Payment request contains urgency keywords.")
        
    payment.risk_score = min(score, 100)
    if payment.risk_score > 0:
        payment.status = "HELD" if payment.risk_score > 50 else "PENDING"
        payment.requires_human_review = payment.risk_score > 30
        
        # Save signals
        for s in signals:
            rs = RiskSignal(payment_id=payment.id, agent_name="DeterministicAdjudicator", severity="HIGH" if payment.risk_score > 50 else "MEDIUM", reason=s)
            db.add(rs)
    else:
        payment.status = "CLEAR"
        payment.requires_human_review = False
        
    db.commit()

async def run_attack_chain_analysis(db: Session):
    # Find all recent suspicious payments
    suspicious = db.query(Payment).filter(Payment.risk_score > 30, Payment.status.in_(["PENDING", "HELD"])).all()
    if len(suspicious) < 2:
        return
        
    # Relationship Extraction
    edges = []
    for i in range(len(suspicious)):
        for j in range(i + 1, len(suspicious)):
            p1 = suspicious[i]
            p2 = suspicious[j]
            
            reasons = []
            weight = 0
            
            if p1.bank_account and p1.bank_account == p2.bank_account:
                reasons.append("SAME_BANK_ACCOUNT")
                weight += 40
            if p1.requested_by and p1.requested_by == p2.requested_by:
                reasons.append("SAME_REQUESTER")
                weight += 25
            if p1.vendor_id == p2.vendor_id:
                reasons.append("SAME_VENDOR")
                weight += 15
                
            # Close timing (simplified as they are all recent in our demo)
            reasons.append("CLOSE_TIMING")
            weight += 10
            
            if weight >= 40:
                edges.append((p1, p2, weight, reasons))
                
    # Simple clustering (Connected Components)
    parent = {p.id: p.id for p in suspicious}
    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]
    
    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    for e in edges:
        union(e[0].id, e[1].id)
        
    clusters = {}
    for p in suspicious:
        root = find(p.id)
        if root not in clusters:
            clusters[root] = []
        clusters[root].append(p)
        
    # Create campaigns for clusters > 1
    for root, cluster_payments in clusters.items():
        if len(cluster_payments) > 1:
            # Check if campaign already exists for these payments
            existing = db.query(CampaignPayment).filter(CampaignPayment.payment_id == cluster_payments[0].id).first()
            if existing:
                continue # Already in a campaign
                
            total_exposure = sum(p.amount for p in cluster_payments)
            
            # Prepare payload for RocketRide
            evidence = []
            for e in edges:
                if e[0] in cluster_payments and e[1] in cluster_payments:
                    evidence.append(f"Linked {e[0].id} and {e[1].id} due to {', '.join(e[3])}")
            
            payload = {
                "payments": [p.id for p in cluster_payments],
                "exposure": total_exposure,
                "evidence": evidence
            }
            
            # Call RocketRide Agent
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            pipe_path = os.path.join(project_root, "rocketride", "ap_sentinel_local.pipe")
            
            try:
                rr_res = await run_pipeline(pipe_path, {"payment": payload, "campaign_analysis": True})
            except Exception as e:
                print(f"RocketRide failed: {e}")
                rr_res = {
                    "campaign_type": "Deterministic Coordinated Fraud",
                    "confidence": 0,
                    "attack_stage": "UNKNOWN",
                    "summary": f"AI Analysis Failed: {str(e)}"
                }
            
            campaign = AttackCampaign(
                campaign_type=rr_res.get("campaign_type", "Coordinated Vendor Payment Fraud"),
                confidence=rr_res.get("confidence", 85.0),
                stage=rr_res.get("attack_stage", "PAYMENT_MANIPULATION"),
                total_exposure=total_exposure,
                reasoning=rr_res.get("summary", "Coordinated attack detected across multiple transactions."),
                status="ACTIVE"
            )
            db.add(campaign)
            db.flush()
            
            for p in cluster_payments:
                cp = CampaignPayment(
                    campaign_id=campaign.id,
                    payment_id=p.id,
                    reason="Clustered based on deterministic relationship engine"
                )
                db.add(cp)
            db.commit()
