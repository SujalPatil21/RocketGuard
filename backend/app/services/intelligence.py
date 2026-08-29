import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.fraud import Payment, RiskSignal, AttackCampaign, CampaignPayment, Vendor
from app.services.rocketride_service import run_pipeline, get_pipe_filename
from app.services import graph
from app.services import verifier
import os
from collections import defaultdict

_DERIVED_RELATIONSHIP_FOR_REASON = {
    "SAME_BANK_ACCOUNT": "SHARES_ACCOUNT",
    "SAME_REQUESTER": "SHARES_REQUESTER",
    "SAME_VENDOR": "SHARES_VENDOR",
    "CLOSE_TIMING": "TEMPORALLY_NEAR",
}

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
        
    # Relationship Extraction using index-based candidate generation
    bank_map = defaultdict(list)
    request_map = defaultdict(list)
    vendor_map = defaultdict(list)
    
    for p in suspicious:
        if p.bank_account: bank_map[p.bank_account].append(p)
        if p.requested_by: request_map[p.requested_by].append(p)
        if p.vendor_id: vendor_map[p.vendor_id].append(p)
        
    edges = []
    seen_pairs = set()
    
    def add_edge_if_eligible(p1, p2):
        pair = tuple(sorted((p1.id, p2.id)))
        if pair in seen_pairs: return
        
        # 72-hour temporal window check
        time_diff = abs((p1.created_at or datetime.utcnow()) - (p2.created_at or datetime.utcnow()))
        if time_diff > timedelta(hours=72):
            return
            
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
            
        reasons.append("CLOSE_TIMING")
        weight += 10
        
        if weight >= 40:
            edges.append((p1, p2, weight, reasons))
            seen_pairs.add(pair)

            for reason in reasons:
                rel_type = _DERIVED_RELATIONSHIP_FOR_REASON.get(reason)
                if not rel_type:
                    continue
                if reason == "SAME_BANK_ACCOUNT":
                    evidence = f"Both {p1.id} and {p2.id} use bank account {p1.bank_account}."
                elif reason == "SAME_REQUESTER":
                    evidence = f"Both {p1.id} and {p2.id} were requested by {p1.requested_by}."
                elif reason == "SAME_VENDOR":
                    evidence = f"Both {p1.id} and {p2.id} were paid to vendor {p1.vendor_id}."
                else:
                    evidence = f"{p1.id} and {p2.id} were submitted within 72 hours of each other."
                graph.link_derived_relationship(p1.id, p2.id, rel_type, evidence)

    for group in [bank_map, request_map, vendor_map]:
        for items in group.values():
            if len(items) > 1:
                for i in range(len(items)):
                    for j in range(i + 1, len(items)):
                        add_edge_if_eligible(items[i], items[j])
                
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

            # Persistent investigation memory: has any of these entities appeared in a
            # previous campaign? Queried from Neo4j, not invented by the LLM.
            bank_accounts = list({p.bank_account for p in cluster_payments if p.bank_account})
            requesters = list({p.requested_by for p in cluster_payments if p.requested_by})
            vendor_ids = list({p.vendor_id for p in cluster_payments if p.vendor_id})
            historical = graph.get_historical_campaigns_for_entities(bank_accounts, requesters, vendor_ids)
            for h in historical:
                evidence.append(
                    f"Historical association: an entity in this cluster previously appeared "
                    f"in campaign {h['campaign_id']} ({h['campaign_type']})."
                )

            payload = {
                "payments": [p.id for p in cluster_payments],
                "exposure": total_exposure,
                "evidence": evidence
            }
            
            # Call RocketRide Agent
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            pipe_path = os.path.join(project_root, "rocketride", get_pipe_filename())
            
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

            # Verify RocketRide's claims against the deterministic evidence it was actually
            # given, before trusting any of it.
            verification = verifier.verify_campaign_claim(rr_res, [p.id for p in cluster_payments], evidence)
            rr_res = verification["result"]
            failed_checks = [c for c in verification["verification"]["checks"] if c["result"] == "FAIL"]

            reasoning = rr_res.get("summary", "Coordinated attack detected across multiple transactions.")
            if failed_checks:
                reasoning += " [Verifier corrected: " + "; ".join(c["detail"] for c in failed_checks) + "]"

            campaign = AttackCampaign(
                campaign_type=rr_res.get("campaign_type", "Coordinated Vendor Payment Fraud"),
                confidence=rr_res.get("confidence", 85.0),
                stage=rr_res.get("attack_stage", "PAYMENT_MANIPULATION"),
                total_exposure=total_exposure,
                reasoning=reasoning,
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

            graph.link_campaign(campaign.id, campaign.campaign_type, [p.id for p in cluster_payments])


async def investigate_payment(payment: Payment, db: Session) -> dict:
    """
    On-demand investigation for a single payment (Phase 10/14):
    Payment -> Anomaly -> Neo4j relationships -> Persistent memory -> RocketRide -> Verifier.
    """
    if payment.risk_score == 0 and payment.status == "PENDING":
        run_risk_adjudicator(payment, db)

    anomaly = {
        "anomalous": payment.risk_score > 0,
        "risk_score": payment.risk_score,
        "signals": [s.reason for s in payment.signals],
    }

    relationships = graph.get_relationship_network(payment.id)
    historical = graph.get_historical_campaigns_for_entities(
        [payment.bank_account] if payment.bank_account else [],
        [payment.requested_by] if payment.requested_by else [],
        [payment.vendor_id] if payment.vendor_id else [],
    )

    if not relationships and not historical:
        # No coordinated evidence to reason over — don't ask RocketRide to render a
        # "campaign" judgment on an empty evidence set. Anomaly-only cases are reported
        # deterministically as individual fraud, not invented as a network attack.
        return {
            "payment_id": payment.id,
            "anomaly": anomaly,
            "relationships": [],
            "historical_associations": [],
            "campaign_result": None,
            "verdict": "INDIVIDUAL_FRAUD" if anomaly["anomalous"] else "NORMAL",
        }

    evidence_lines = [
        f"{r['relationship']}: {r.get('evidence') or ('linked to ' + r['payment_id'])}"
        for r in relationships
    ]
    for h in historical:
        evidence_lines.append(
            f"Historical association: this payment's account/requester/vendor previously "
            f"appeared in campaign {h['campaign_id']} ({h['campaign_type']})."
        )

    connected_ids = list({r["payment_id"] for r in relationships})
    all_payment_ids = [payment.id] + connected_ids
    connected_payments = db.query(Payment).filter(Payment.id.in_(connected_ids)).all() if connected_ids else []
    exposure = payment.amount + sum(p.amount for p in connected_payments)

    payload = {"payments": all_payment_ids, "exposure": exposure, "evidence": evidence_lines}

    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    pipe_path = os.path.join(project_root, "rocketride", get_pipe_filename())

    try:
        rr_res = await run_pipeline(pipe_path, {"payment": payload, "campaign_analysis": True})
    except Exception as e:
        rr_res = {
            "campaign_type": "Unknown",
            "confidence": 0,
            "attack_stage": "UNKNOWN",
            "summary": f"AI Analysis Failed: {str(e)}",
            "evidence": [],
            "recommended_action": "Manual review required (AI unavailable).",
        }

    verification = verifier.verify_campaign_claim(rr_res, all_payment_ids, evidence_lines)
    rr_res = verification["result"]

    if relationships or historical:
        verdict = "COORDINATED_ATTACK"
    elif anomaly["anomalous"]:
        verdict = "INDIVIDUAL_FRAUD"
    else:
        verdict = "NORMAL"

    return {
        "payment_id": payment.id,
        "anomaly": anomaly,
        "relationships": relationships,
        "historical_associations": historical,
        "campaign_result": rr_res,
        "verification": verification["verification"],
        "verdict": verdict,
    }
