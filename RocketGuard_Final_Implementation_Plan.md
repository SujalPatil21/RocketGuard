# RocketGuard — Final Implementation Plan
## Neo4j + RocketRide + Anomaly Detection + Persistent Investigation Memory

---

## 1. Objective

Strengthen the existing RocketGuard fraud-detection project without depending on RocketRide SQL or RocketRide Graph nodes, which are not available in the current RocketRide environment.

The implementation should use the RocketRide components that are actually available:

- **Neo4j** — fraud relationship graph
- **RocketRide pipeline** — AI workflow/orchestration
- **Anomaly Detector** — individual transaction anomaly detection
- **Persistent Memory** — historical investigation memory
- **One Agent** — coordinates the investigation
- **One LLM** — evidence-grounded reasoning
- **SQLite** — retain existing authentication/user persistence
- **FastAPI** — backend/API orchestration
- **React** — frontend

The implementation must preserve working features, avoid unnecessary rewrites, and prioritize a convincing dynamic fraud-investigation USP that can be completed within a few hours.

---

# 2. Core USP

## Relationship + Memory-Based Fraud Investigation

The product should not simply answer:

> Is this transaction fraudulent?

It should answer:

> **Is this transaction connected to a larger coordinated attack, and have we seen the entities involved in previous investigations?**

The investigation has three levels:

```text
LEVEL 1 — Transaction
        ↓
Is this payment anomalous?

LEVEL 2 — Relationship
        ↓
What other payments/entities are connected?

LEVEL 3 — Historical intelligence
        ↓
Have these entities appeared in previous suspicious campaigns?
```

The final result is an evidence-backed campaign assessment.

Example:

```text
Payment P104
    │
    ├── shared account ── P088
    │
    ├── same requester ── P091
    │
    └── amount escalation ── P110
              │
              ▼
      Coordinated campaign
              │
              ▼
        RocketRide reasoning
```

---

# 3. Final Architecture

```text
                         ┌──────────────────┐
                         │    React UI      │
                         │                  │
                         │ Dashboard        │
                         │ Payments         │
                         │ Attack Intel ⭐   │
                         │ Campaign Detail  │
                         └────────┬─────────┘
                                  │ REST / JSON
                                  ▼
                         ┌──────────────────┐
                         │     FastAPI      │
                         │ API + Orchestrator│
                         └───────┬─────┬────┘
                                 │     │
                  ┌──────────────┘     └──────────────┐
                  ▼                                   ▼
             ┌───────────┐                     ┌─────────────┐
             │  SQLite   │                     │   Neo4j     │
             │           │                     │             │
             │ Users/Auth│                     │ Payments    │
             └───────────┘                     │ Vendors     │
                                                │ Accounts    │
                                                │ Requesters  │
                                                │ IFSC        │
                                                │ Campaigns   │
                                                └──────┬──────┘
                                                       │
                                                       ▼
                                              Relationship Evidence
                                                       │
                                                       ▼
                                             RocketRide Pipeline
                                                       │
                             ┌─────────────────────────┼────────────────────┐
                             ▼                         ▼                    ▼
                       History Agent            Anomaly Detector         Pattern
                             │                         │                    │
                             └─────────────────────────┼────────────────────┘
                                                       ▼
                                             Investigation Agent
                                                       │
                                                       ▼
                                             Persistent Memory
                                                       │
                                                       ▼
                                                   Verifier
                                                       │
                                                       ▼
                                            Attack Campaign Result
                                                       │
                                                       ▼
                                                   React UI
```

---

# 4. Responsibility of Each Component

| Component | Responsibility |
|---|---|
| SQLite | Existing authentication/user persistence |
| Neo4j | Fraud-domain data and relationship graph |
| RocketRide Pipeline | AI workflow/orchestration |
| Anomaly Detector | Detect unusual individual transactions |
| Persistent Memory | Remember previous investigations/campaigns |
| Agent | Coordinate investigation steps |
| LLM | Explain evidence and classify attack |
| FastAPI | APIs, deterministic calculations, orchestration |
| React | Analyst dashboard and investigation UI |

Do not introduce additional databases unless required by an existing working component.

---

# 5. Critical Implementation Principles

1. **Inspect before modifying.**
2. Preserve existing working features.
3. Do not migrate authentication unless absolutely necessary.
4. Do not depend on unavailable RocketRide SQL or RocketRide Graph.
5. Use the available Neo4j node.
6. Do not hardcode campaign membership.
7. Do not allow the LLM to invent evidence.
8. Deterministic calculations must happen in backend/graph logic.
9. RocketRide should reason over supplied evidence.
10. The public dataset and synthetic scenarios must be importable.
11. The graph must actually influence campaign detection.
12. Every relationship should have explainable evidence.
13. Every phase must end with an explicit completion report.
14. If blocked, report the exact blocker instead of silently skipping work.

---

# 6. PHASE 0 — Existing Project Audit

## Goal

Understand what already exists before changing code.

Inspect:

- frontend structure
- backend structure
- SQLite setup
- authentication
- JSON files
- payment models
- vendor models
- risk logic
- current RocketRide pipeline
- History agent
- Pattern agent
- Risk Adjudicator
- Verifier
- campaign logic
- existing API endpoints
- frontend screens

Classify everything as:

```text
WORKING
PARTIALLY WORKING
MISSING
BROKEN
```

Create:

```text
CURRENT_STATUS.md
```

### Do not modify implementation during the audit.

### Completion requirement

Report:

```text
PHASE 0 COMPLETED
```

and provide the audit summary.

---

# 7. PHASE 1 — Verify Neo4j

## Goal

Confirm that the available Neo4j node works before migrating fraud data.

Perform a minimal test:

```text
Create Payment P001
        ↓
Create Vendor V001
        ↓
Create PAID_TO relationship
        ↓
Query P001
        ↓
Return V001
```

Then test:

```text
Payment
  ↓
Bank Account
  ↓
Another Payment
```

### Verify

- connection
- authentication/configuration
- node creation
- relationship creation
- basic query
- multi-hop query
- backend access
- RocketRide access if supported by the current environment

### Do not invent undocumented configuration fields or APIs.

If Neo4j cannot be made usable quickly, report the exact issue and use a deterministic SQLite relationship fallback rather than blocking the whole project.

### Completion requirement

```text
Neo4j connection: PASS
Node creation: PASS
Relationship creation: PASS
Query: PASS
Multi-hop query: PASS
Backend access: PASS/FAIL
RocketRide access: PASS/FAIL
```

Then:

```text
PHASE 1 COMPLETED
```

---

# 8. PHASE 2 — Fraud Graph Schema

## Goal

Create a minimal but useful fraud graph.

### Nodes

```text
Payment
Vendor
BankAccount
Requester
IFSC
Campaign
```

Optional only if the dataset genuinely supports them:

```text
Device
IP
Beneficiary
```

Do not over-model.

### Factual relationships

```text
(Payment)-[:PAID_TO]->(Vendor)
(Payment)-[:USES_ACCOUNT]->(BankAccount)
(Payment)-[:REQUESTED_BY]->(Requester)
(Payment)-[:USES_IFSC]->(IFSC)
(Payment)-[:PART_OF]->(Campaign)
```

### Derived relationships

```text
(Payment)-[:SHARES_ACCOUNT]->(Payment)
(Payment)-[:SHARES_REQUESTER]->(Payment)
(Payment)-[:SHARES_VENDOR]->(Payment)
(Payment)-[:TEMPORALLY_NEAR]->(Payment)
(Payment)-[:AMOUNT_ESCALATES]->(Payment)
```

Derived relationships must include evidence.

Example:

```text
P001 ↔ P007

Relationship:
SHARES_ACCOUNT

Evidence:
Both transactions use account BAD8888.
```

---

# 9. PHASE 3 — Proper Data Foundation

## Goal

Stop treating JSON as the application's permanent runtime database.

The new flow should be:

```text
JSON / Dataset
      ↓
Normalizer
      ↓
Validator
      ↓
Deduplicator
      ↓
Neo4j
```

SQLite remains for existing authentication.

### Fraud data moves to Neo4j

```text
Neo4j
├── Payments
├── Vendors
├── Bank Accounts
├── Requesters
├── IFSC
├── Risk Signals
└── Campaigns
```

---

# 10. PHASE 4 — Dataset Strategy

Use three data sources.

## A. Existing project JSON

Use current files such as:

```text
payments.json
vendors.json
payment-history.json
```

These become import sources rather than the final runtime source of truth.

---

## B. One public fraud dataset

Use one suitable public transaction/fraud dataset.

The implementation must:

1. inspect the dataset schema
2. map fields to the RocketGuard schema
3. normalize types/formats
4. preserve source information
5. clearly identify missing fields
6. avoid fabricating real-world values

Example:

```text
Public Dataset
      ↓
Dataset Adapter
      ↓
Normalized Payment
      ↓
Neo4j
```

If the dataset is not available locally, do not pretend it exists.

Clearly report:

```text
DATASET REQUIRED:
<filename>

EXPECTED LOCATION:
<data directory>

EXPECTED FORMAT:
<CSV/JSON/etc.>
```

---

## C. Synthetic coordinated-attack scenarios

Create approximately 4–5 controlled scenarios.

### Scenario 1 — Normal

```text
Normal payments
No suspicious network
```

### Scenario 2 — Individual fraud

```text
One anomalous transaction
No meaningful network
```

### Scenario 3 — Shared-account attack

```text
Multiple payments
        ↓
Same destination account
```

### Scenario 4 — Cross-vendor attack

```text
Vendor A ─┐
Vendor B ─┼→ Same suspicious account
Vendor C ─┘
```

### Scenario 5 — Escalating campaign

```text
₹8K → ₹15K → ₹45K → ₹95K
```

with shared account/requester and close timestamps.

The synthetic scenarios are for demonstrating the system's ability to discover patterns, not for pretending they are real-world observations.

---

# 11. PHASE 5 — Data Importer

Create one repeatable importer.

Example:

```text
python import_data.py
```

Flow:

```text
Dataset
  ↓
Validate
  ↓
Normalize
  ↓
Deduplicate
  ↓
Create entities
  ↓
Create relationships
  ↓
Neo4j
```

The importer must be safe to run repeatedly.

Avoid uncontrolled duplicate nodes.

### Completion requirement

A fresh environment can be populated from the supplied data with one documented command.

Report:

```text
PHASE 5 COMPLETED
```

---

# 12. PHASE 6 — Individual Anomaly Detection

Use the available RocketRide **Anomaly Detector**.

Flow:

```text
Payment
   ↓
Anomaly Detector
   ↓
Anomaly result
```

Possible evidence:

- unusually high amount
- unusual transaction frequency
- unusual timing
- deviation from historical behavior

Example:

```json
{
  "payment_id": "P104",
  "anomaly": true,
  "anomaly_type": "amount",
  "evidence": "Amount significantly exceeds normal range"
}
```

The anomaly detector/backend establishes the fact.

The LLM should not invent numerical anomaly results.

---

# 13. PHASE 7 — Relationship Investigation

This is the core USP.

When a payment becomes suspicious:

```text
Suspicious Payment
        ↓
Find connected entities
        ↓
Find related payments
        ↓
Build relationship evidence
```

Example:

```text
P104
 │
 ├── same account → P088
 ├── same requester → P091
 └── same vendor → P073
```

Then investigate second-level relationships where useful:

```text
P104
 ↓
Account X
 ↓
P088
 ↓
Requester Rahul
 ↓
P091
```

Return structured evidence.

---

# 14. PHASE 8 — Dynamic Campaign Detection

This phase must be data-driven.

### Forbidden

```python
if scenario == "attack_3":
    campaign = True
```

### Required

```text
Suspicious Payment
        ↓
Related Payments
        ↓
Relationship Evidence
        ↓
Temporal Analysis
        ↓
Amount Behavior
        ↓
Shared Entities
        ↓
Campaign Candidate
```

Use configurable evidence weights.

Example starting point:

| Evidence | Weight |
|---|---:|
| Shared bank account | 30 |
| Shared requester | 20 |
| Multiple vendors | 20 |
| Close timestamps | 15 |
| Amount escalation | 15 |

Interpretation:

```text
0–49     → weak/isolated
50–69    → suspicious cluster
70–84    → probable campaign
85–100   → high-confidence campaign
```

These are implementation defaults, not universal fraud thresholds.

The system should discover campaign membership from data rather than scenario IDs.

---

# 15. PHASE 9 — Persistent Investigation Memory

Use the available **Persistent Memory** node if it works reliably.

Store:

```text
Previous campaign
Suspicious account
Requester
Vendor
Attack type
Evidence
Exposure
Decision
```

Example previous case:

```text
Campaign #001

Account: BAD8888
Requester: Rahul
Vendors: 3
Exposure: ₹4.2L
Status: Confirmed
```

Later:

```text
New Payment
Account: BAD8888
```

The system should retrieve:

```text
Previous association detected.

BAD8888 appeared in Campaign #001.

Previous exposure: ₹4.2L
```

This creates the historical intelligence layer.

---

# 16. PHASE 10 — RocketRide Investigation Agent

The investigation agent should receive:

```text
Transaction
+
Anomaly Result
+
Neo4j Relationships
+
Historical Memory
+
Calculated Campaign Evidence
```

The LLM should return structured output:

```json
{
  "campaign_type": "Coordinated Payment Manipulation",
  "attack_stage": "Execution",
  "confidence": 94,
  "summary": "...",
  "evidence": [],
  "recommended_action": "Hold and investigate"
}
```

### Hard rule

The LLM must not invent:

- payment IDs
- amounts
- vendors
- relationships
- timestamps
- exposure
- historical events

It must only reason over supplied evidence.

---

# 17. PHASE 11 — Verifier

Use the existing Verifier.

Flow:

```text
RocketRide conclusion
        ↓
Verifier
        ↓
Compare with Neo4j/backend evidence
        ↓
Accept / correct / reject
```

Example:

If the AI says:

> Four payments share the same account.

The verifier checks Neo4j.

If only three actually do, the conclusion must be corrected or rejected.

This gives the project:

> **AI reasoning + evidence verification**

instead of an unexplained LLM answer.

---

# 18. PHASE 12 — Backend APIs

Create or adapt:

```text
GET  /api/payments
GET  /api/payments/{id}

GET  /api/campaigns
GET  /api/campaigns/{id}

GET  /api/campaigns/{id}/payments
GET  /api/campaigns/{id}/relationships

POST /api/payments/{id}/investigate
```

The main investigation endpoint should perform:

```text
Payment
 ↓
Anomaly
 ↓
Neo4j relationships
 ↓
Persistent Memory
 ↓
RocketRide Agent
 ↓
Verifier
 ↓
Campaign Result
```

Responses should contain:

- payment information
- related payments
- shared entities
- relationship evidence
- timeline
- exposure
- campaign confidence
- attack stage
- RocketRide reasoning
- recommended action

---

# 19. PHASE 13 — Frontend

Keep existing pages working.

Add/upgrade:

```text
Dashboard
Payments
Attack Intelligence ⭐
Campaign Details
```

---

## Attack Intelligence page

Show:

```text
Active Campaigns
Affected Payments
Affected Vendors
Total Exposure
```

Campaign detail:

```text
Campaign
    ↓
Timeline
    ↓
Connected Payments
    ↓
Shared Entities
    ↓
Evidence
    ↓
Historical Associations
    ↓
RocketRide Assessment
    ↓
Recommended Action
```

---

# 20. Graph Visualization

Use Neo4j relationship data.

Example:

```text
             Bank Account
                BAD8888
              /   |   \
             /    |    \
           P101  P104  P117
             \    |    /
               Rahul
```

The visualization must represent real backend relationships.

Do not draw a fake graph just for appearance.

If an interactive graph becomes too time-consuming, provide a clean relationship/timeline visualization using the same API.

---

# 21. PHASE 14 — Investigation Interaction

Add:

```text
[ Investigate Payment ]
```

Flow:

```text
User selects P104
        ↓
Click Investigate
        ↓
Analyzing transaction...
        ↓
Checking anomaly...
        ↓
Finding connected entities...
        ↓
Checking investigation history...
        ↓
RocketRide investigation...
        ↓
Verifying evidence...
        ↓
Campaign result
```

Then reveal:

```text
🚨 COORDINATED ATTACK DETECTED
```

This makes the demo dynamic rather than static.

---

# 22. PHASE 15 — End-to-End Scenarios

Test three primary paths.

## Normal

```text
Payment
 ↓
No anomaly
 ↓
No campaign
```

## Individual fraud

```text
Payment
 ↓
Anomaly
 ↓
No meaningful network
 ↓
Individual fraud
```

## Coordinated campaign

```text
Payment
 ↓
Anomaly
 ↓
Neo4j relationships
 ↓
Historical memory
 ↓
Campaign candidate
 ↓
RocketRide reasoning
 ↓
Verifier
 ↓
Attack campaign
```

---

# 23. Final Demo Flow

The demo should take approximately 2 minutes.

### Step 1

Show a normal transaction.

```text
₹12,000
Low risk
No campaign
```

### Step 2

Select a suspicious payment.

```text
₹95,000
Anomalous
```

### Step 3

Click:

```text
INVESTIGATE
```

### Step 4

Neo4j reveals:

```text
P104
 │
 ├── shared account ── P088
 │
 ├── same requester ── P091
 │
 └── amount escalation ── P110
```

### Step 5

Persistent Memory reveals:

```text
Previous campaign association found.
```

### Step 6

RocketRide generates:

```text
COORDINATED PAYMENT ATTACK

Confidence: 94%

Evidence:
• shared destination account
• repeated requester
• multiple vendors
• escalating transaction amounts
• previous suspicious association
```

### Step 7

Show:

```text
Current exposure
+
Historical exposure
+
Recommended action
```

---

# 24. Hackathon Priority

## MUST HAVE

```text
Neo4j
 ↓
Fraud relationships
 ↓
Dynamic campaign detection
 ↓
RocketRide reasoning
 ↓
Evidence
 ↓
Attack Intelligence UI
```

## SHOULD HAVE

```text
Public dataset
Synthetic scenarios
Persistent Memory
Timeline
Graph visualization
Verifier
```

## NICE TO HAVE

```text
Animations
Advanced analytics
Large datasets
Many fraud categories
Extra integrations
Production deployment
```

Do not sacrifice the working core USP for cosmetic features.

---

# 25. What NOT to Add

Despite the available node library, do not add these unless a real requirement appears:

```text
ClickHouse
MySQL
PostgreSQL
Supabase
MongoDB
Pinecone
Qdrant
Weaviate
Chroma
Exa Search
Multiple agent frameworks
Multiple LLM providers
```

Do not use five different databases just because they are available.

Do not use embeddings/vector search unless there is a genuine semantic-search requirement.

---

# 26. Recommended 3–4 Hour Execution

## Hour 1

```text
Phase 0 — Audit
Phase 1 — Neo4j
Phase 2 — Graph schema
Phase 3 — Data foundation
```

## Hour 2

```text
Phase 4 — Dataset
Phase 5 — Importer
Phase 6 — Anomaly detection
Phase 7 — Relationship investigation
```

## Hour 3

```text
Phase 8 — Dynamic campaign detection
Phase 9 — Persistent Memory
Phase 10 — RocketRide investigation
Phase 11 — Verifier
```

## Final 45–60 minutes

```text
Phase 12 — APIs
Phase 13 — Frontend
Phase 14 — Investigation interaction
Phase 15 — Demo testing
```

If time becomes tight, prioritize:

```text
Neo4j
+
Dynamic Attack Chain
+
RocketRide reasoning
+
Evidence UI
```

---

# 27. Definition of Done

The project is considered complete when:

- [ ] Existing authentication still works.
- [ ] Neo4j connection works.
- [ ] Fraud data can be imported.
- [ ] Payments/vendors/accounts/requesters exist in Neo4j.
- [ ] Relationships are created from actual data.
- [ ] Anomaly detection works.
- [ ] Suspicious payments trigger relationship investigation.
- [ ] Campaigns are discovered dynamically.
- [ ] Campaign exposure is calculated deterministically.
- [ ] Previous investigations can be retrieved.
- [ ] RocketRide reasons over the evidence.
- [ ] Verifier validates the AI conclusion.
- [ ] Campaign API works.
- [ ] Attack Intelligence UI works.
- [ ] Graph/timeline evidence is visible.
- [ ] Normal, individual-fraud and coordinated-attack scenarios work.
- [ ] No campaign is hardcoded to a scenario ID.
- [ ] Demo can be run reliably.

---

# 28. Required Final Status Report

At the end, create:

```text
FINAL_STATUS.md
```

Include:

```text
Completed features
Known limitations
Manual setup required
Environment variables required
Dataset files required
Neo4j setup
RocketRide setup
Run commands
Demo commands
Known bugs
```

The implementation agent must explicitly state:

```text
PHASE 0 COMPLETED
PHASE 1 COMPLETED
PHASE 2 COMPLETED
...
PHASE 15 COMPLETED
```

For any incomplete phase:

```text
PHASE X BLOCKED

Reason:
...

Manual action required:
...

Impact:
...
```

Never silently mark an incomplete phase as completed.

---

# 29. Final Product Statement

The final product should be presented as:

> **RocketGuard does not only detect suspicious transactions. It investigates the network and history behind them to uncover coordinated and recurring fraud campaigns. Neo4j discovers relationships, RocketRide orchestrates and reasons over the evidence, Anomaly Detection identifies unusual transactions, and Persistent Memory connects today's investigation with previous cases.**

The central flow is:

```text
             NEW PAYMENT
                  │
                  ▼
          ┌───────────────┐
          │    Anomaly    │
          │    Detector   │
          └───────┬───────┘
                  │
             suspicious
                  │
                  ▼
                NEO4J
                  │
          Find relationships
                  │
                  ▼
           ATTACK NETWORK
                  │
                  ▼
        PERSISTENT MEMORY
                  │
          Previous cases
                  │
                  ▼
         ROCKETRIDE AGENT
                  │
             AI reasoning
                  │
                  ▼
              VERIFIER
                  │
                  ▼
         🚨 ATTACK CAMPAIGN
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
       Evidence Exposure History
                  │
                  ▼
             HUMAN REVIEW
```

## Core message

**A suspicious payment is only the starting point. RocketGuard investigates the network and history behind it.**
