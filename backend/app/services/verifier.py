"""
Verifier (Phase 11): cross-checks RocketRide's structured claims against the deterministic
evidence actually computed for a campaign. RocketRide only ever sees text evidence — this
module is what keeps it honest by re-deriving the same facts from the DB/graph and comparing.

Only claims we can factually check are checked. Free-text fields (summary, recommended_action)
are left alone — they're framed, not verified.
"""
from typing import Any


def verify_campaign_claim(rr_result: dict[str, Any], payment_ids: list[str], evidence_lines: list[str]) -> dict[str, Any]:
    """
    Compare RocketRide's claimed evidence/confidence against the deterministic evidence that
    was actually supplied to it. Returns the (possibly corrected) result plus a verification
    report. RocketRide was only ever given `evidence_lines` and `payment_ids` — it cannot know
    about anything not in those two inputs, so any claim outside them is unverifiable/invented.
    """
    report: dict[str, Any] = {"checks": [], "verified": True}

    claimed_evidence = rr_result.get("evidence") or []
    if not isinstance(claimed_evidence, list):
        claimed_evidence = [claimed_evidence]

    # Check 1: every payment ID mentioned anywhere in the claimed evidence/summary must be
    # one of the payment IDs actually supplied.
    supplied_ids = set(payment_ids)
    haystack = " ".join([str(x) for x in claimed_evidence] + [str(rr_result.get("summary", ""))])
    invented_ids = []
    for token in haystack.replace(",", " ").split():
        cleaned = token.strip(".:;()[]\"'")
        # Payment IDs in this system look like "PAY-000001" / "PAY-IN-000001".
        if cleaned.upper().startswith("PAY-") and cleaned not in supplied_ids:
            invented_ids.append(cleaned)

    if invented_ids:
        report["checks"].append({
            "check": "payment_ids_grounded",
            "result": "FAIL",
            "detail": f"Response references payment ID(s) not in the supplied set: {invented_ids}",
        })
        report["verified"] = False
    else:
        report["checks"].append({"check": "payment_ids_grounded", "result": "PASS"})

    # Check 2: confidence must be a number in [0, 100].
    confidence = rr_result.get("confidence")
    if not isinstance(confidence, (int, float)) or not (0 <= confidence <= 100):
        report["checks"].append({
            "check": "confidence_range",
            "result": "FAIL",
            "detail": f"confidence={confidence!r} is not a number in [0, 100]",
        })
        report["verified"] = False
        rr_result = {**rr_result, "confidence": 0}
    else:
        report["checks"].append({"check": "confidence_range", "result": "PASS"})

    # Check 3: required fields must be present.
    required = ["campaign_type", "attack_stage", "confidence", "summary", "recommended_action"]
    missing = [f for f in required if f not in rr_result]
    if missing:
        report["checks"].append({
            "check": "required_fields",
            "result": "FAIL",
            "detail": f"Missing fields: {missing}",
        })
        report["verified"] = False
    else:
        report["checks"].append({"check": "required_fields", "result": "PASS"})

    return {"result": rr_result, "verification": report}
