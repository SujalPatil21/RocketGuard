"""
Neo4j fraud-relationship graph service.

Architecture note (per RocketGuard_Final_Implementation_Plan.md section 3):
FastAPI talks to Neo4j directly through this module. RocketRide only ever receives
already-computed relationship evidence as text — it never queries Neo4j itself.

All writes are idempotent (MERGE), so the importer and the campaign engine can call
these functions repeatedly without creating duplicate nodes/relationships.

If NEO4J_URI is not configured, `is_configured()` returns False and every public
function becomes a no-op — callers should treat this module as best-effort and never
let a graph failure break the deterministic SQLite-based flow.
"""
import os
import logging
from typing import Any

from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError

logger = logging.getLogger(__name__)

_driver = None
_driver_init_attempted = False


def is_configured() -> bool:
    return bool(os.environ.get("NEO4J_URI"))


def _get_driver():
    global _driver, _driver_init_attempted
    if _driver is not None:
        return _driver
    if _driver_init_attempted:
        return None
    _driver_init_attempted = True
    if not is_configured():
        return None
    try:
        _driver = GraphDatabase.driver(
            os.environ["NEO4J_URI"],
            auth=(os.environ["NEO4J_USER"], os.environ["NEO4J_PASSWORD"]),
        )
        _driver.verify_connectivity()
        logger.info("Neo4j connected: %s", os.environ["NEO4J_URI"])
    except Exception as e:
        logger.warning("Neo4j unavailable, graph features disabled: %s", e)
        _driver = None
    return _driver


def close():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def upsert_payment(payment: dict[str, Any]) -> bool:
    """
    MERGE a Payment and its factual relationships (PAID_TO, USES_ACCOUNT, REQUESTED_BY,
    USES_IFSC). Expects the same fields as the SQLAlchemy Payment model.
    Returns True if the write succeeded, False if Neo4j is unavailable.
    """
    driver = _get_driver()
    if driver is None:
        return False
    try:
        with driver.session() as session:
            session.run(
                """
                MERGE (p:Payment {id: $id})
                SET p.amount = $amount,
                    p.currency = $currency,
                    p.status = $status,
                    p.submitted_at = $submitted_at

                MERGE (v:Vendor {id: $vendor_id})
                SET v.name = $vendor_name
                MERGE (p)-[:PAID_TO]->(v)

                WITH p
                FOREACH (_ IN CASE WHEN $bank_account IS NOT NULL AND $bank_account <> ''
                                    THEN [1] ELSE [] END |
                    MERGE (a:BankAccount {id: $bank_account})
                    MERGE (p)-[:USES_ACCOUNT]->(a)
                )

                WITH p
                FOREACH (_ IN CASE WHEN $requested_by IS NOT NULL AND $requested_by <> ''
                                    THEN [1] ELSE [] END |
                    MERGE (r:Requester {id: $requested_by})
                    MERGE (p)-[:REQUESTED_BY]->(r)
                )

                WITH p
                FOREACH (_ IN CASE WHEN $ifsc IS NOT NULL AND $ifsc <> ''
                                    THEN [1] ELSE [] END |
                    MERGE (i:IFSC {id: $ifsc})
                    MERGE (p)-[:USES_IFSC]->(i)
                )
                """,
                id=payment["id"],
                amount=payment.get("amount"),
                currency=payment.get("currency"),
                status=payment.get("status"),
                submitted_at=payment.get("submitted_at"),
                vendor_id=payment.get("vendor_id"),
                vendor_name=payment.get("vendor_name"),
                bank_account=payment.get("bank_account"),
                requested_by=payment.get("requested_by"),
                ifsc=payment.get("ifsc"),
            )
        return True
    except Neo4jError as e:
        logger.warning("Neo4j upsert_payment failed for %s: %s", payment.get("id"), e)
        return False


def link_derived_relationship(payment_id_1: str, payment_id_2: str, rel_type: str, evidence: str) -> bool:
    """
    Create a derived, evidence-backed relationship between two payments already known
    to Neo4j (SHARES_ACCOUNT, SHARES_REQUESTER, SHARES_VENDOR, TEMPORALLY_NEAR,
    AMOUNT_ESCALATES). Safe no-op if either payment doesn't exist yet or Neo4j is down.
    """
    if rel_type not in {
        "SHARES_ACCOUNT", "SHARES_REQUESTER", "SHARES_VENDOR",
        "TEMPORALLY_NEAR", "AMOUNT_ESCALATES",
    }:
        raise ValueError(f"Unsupported derived relationship type: {rel_type}")

    driver = _get_driver()
    if driver is None:
        return False
    try:
        with driver.session() as session:
            session.run(
                f"""
                MATCH (p1:Payment {{id: $id1}}), (p2:Payment {{id: $id2}})
                MERGE (p1)-[r:{rel_type}]->(p2)
                SET r.evidence = $evidence
                """,
                id1=payment_id_1, id2=payment_id_2, evidence=evidence,
            )
        return True
    except Neo4jError as e:
        logger.warning("Neo4j link_derived_relationship failed (%s <-> %s): %s", payment_id_1, payment_id_2, e)
        return False


def link_campaign(campaign_id: str, campaign_type: str, payment_ids: list[str]) -> bool:
    """MERGE a Campaign node and PART_OF relationships from each payment."""
    driver = _get_driver()
    if driver is None:
        return False
    try:
        with driver.session() as session:
            session.run(
                """
                MERGE (c:Campaign {id: $campaign_id})
                SET c.campaign_type = $campaign_type
                WITH c
                UNWIND $payment_ids AS pid
                MATCH (p:Payment {id: pid})
                MERGE (p)-[:PART_OF]->(c)
                """,
                campaign_id=campaign_id, campaign_type=campaign_type, payment_ids=payment_ids,
            )
        return True
    except Neo4jError as e:
        logger.warning("Neo4j link_campaign failed for %s: %s", campaign_id, e)
        return False


def get_relationship_network(payment_id: str) -> list[dict[str, Any]]:
    """
    Return the directly-connected payments for a given payment, across all factual and
    derived relationship types, with the relationship type and any recorded evidence.
    Used for the Attack Intelligence / Campaign Detail evidence view.
    """
    driver = _get_driver()
    if driver is None:
        return []
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (p:Payment {id: $id})-[r]-(other:Payment)
                RETURN DISTINCT other.id AS payment_id, type(r) AS relationship,
                       r.evidence AS evidence
                """,
                id=payment_id,
            )
            return [dict(record) for record in result]
    except Neo4jError as e:
        logger.warning("Neo4j get_relationship_network failed for %s: %s", payment_id, e)
        return []


def get_historical_campaigns_for_entities(bank_accounts: list[str], requesters: list[str], vendors: list[str]) -> list[dict[str, Any]]:
    """
    Persistent-memory lookup: has any of these accounts/requesters/vendors appeared in a
    previous campaign? Returns campaign ids/types plus the shared entity, for the
    "previous association detected" evidence (Phase 9).
    """
    driver = _get_driver()
    if driver is None:
        return []
    try:
        with driver.session() as session:
            result = session.run(
                """
                MATCH (c:Campaign)<-[:PART_OF]-(p:Payment)
                WHERE any(acc IN $bank_accounts WHERE (p)-[:USES_ACCOUNT]->(:BankAccount {id: acc}))
                   OR any(req IN $requesters WHERE (p)-[:REQUESTED_BY]->(:Requester {id: req}))
                   OR any(v IN $vendors WHERE (p)-[:PAID_TO]->(:Vendor {id: v}))
                RETURN DISTINCT c.id AS campaign_id, c.campaign_type AS campaign_type
                """,
                bank_accounts=bank_accounts or [], requesters=requesters or [], vendors=vendors or [],
            )
            return [dict(record) for record in result]
    except Neo4jError as e:
        logger.warning("Neo4j get_historical_campaigns_for_entities failed: %s", e)
        return []
