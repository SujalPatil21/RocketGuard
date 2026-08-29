# CURRENT_SYSTEM_AUDIT.md

Audit date: 2026-08-29
Authoritative plan used: `RocketGuard_Final_Implementation_Plan.md` (the file named
`RocketGuard_Updated_Final_Implementation_Plan.md` does not exist in this repo — this is
assumed to be the same document under its actual name).

---

## 1. Current Architecture (as built, not as planned)

```
React (Vite, :5173)
   │  REST/JSON, JWT bearer
   ▼
FastAPI (backend/app/main.py)
   │
   ▼
SQLite (backend/auth.db) — SQLAlchemy models
   ├── users, roles, otp_verifications        (auth)
   └── payments, vendors, requesters, risk_signals,
       attack_campaigns, campaign_payments,
       ground_truth_cases                      (fraud domain — NOT split out to Neo4j yet)

Deterministic engine (backend/app/services/intelligence.py)
   ├── run_risk_adjudicator()        — per-payment rule scoring
   └── run_attack_chain_analysis()   — inverted indexes + 72h window + union-find
           │
           ▼
   backend/app/services/rocketride_service.run_pipeline()
           │  RocketRideClient(uri=ROCKETRIDE_URI).connect/use/chat
           ▼
   rocketride/ap_sentinel_local.pipe
      chat_1 → agent_rocketride_1 → llm_ollama_1 (llama3.2 @ 127.0.0.1:11434)
                                   → memory_internal_1
           ▼
   response_answers_1 → back to FastAPI
```

There is also an unused second RocketRide path: `backend/app/db/rr_client.py`
(`RocketRideDB.execute`), which opens the same pipe with `source='db_execute'` and runs raw
SQL through RocketRide's database tool. Nothing in `main.py` or `intelligence.py` imports it —
appears to be leftover/dead code from an earlier "RocketRide SQL" approach the plan explicitly
says to abandon.

**Neo4j does not exist anywhere in the current code.** No driver dependency, no service module,
no server reachable.

## 2. Working Components (verified, not just claimed)

- Auth: JWT + SQLite (`backend/app/auth/**`), 2 users in `auth.db`.
- Dataset import: `backend/scripts/import_datasets.py` + 4 CSVs in `backend/datasets/` already
  loaded into SQLite — counts verified directly against `auth.db`:
  `payments=110, vendors=51, requesters=27, ground_truth_cases=100, attack_campaigns=4,
  campaign_payments=13, risk_signals=59, users=2`.
- Deterministic risk scoring: `run_risk_adjudicator` (`intelligence.py:9-52`) — bank-account
  mismatch, amount vs. historical range, urgency keywords. Pure rules, no LLM.
- Relationship/campaign engine: `run_attack_chain_analysis` (`intelligence.py:54-188`) —
  inverted indexes by bank account/requester/vendor, 72-hour window, weighted edges
  (`SAME_BANK_ACCOUNT=40, SAME_REQUESTER=25, SAME_VENDOR=15, CLOSE_TIMING=10`), Union-Find
  clustering. **Confirmed genuinely data-driven** — no `if scenario == ...` branching found
  anywhere in this file or `main.py`.
- Demo/Expanded mode: `main.py` filters on `Payment.id.like("PAY-IN-%")`; `/api/reset-demo`
  re-runs `seed_data.py`. Consistent with the stated baseline.
- Ollama: **confirmed running** — `127.0.0.1:11434` is LISTENING (pid 24360), matching the
  `llm_ollama_1` node config in the pipe.
- Frontend pages present: `Overview.tsx, Payments.tsx, Activity.tsx, Pipeline.tsx, Auth.tsx,
  Landing.tsx` under `frontend/src/pages/`.

## 3. Partial Components (exact gaps)

- **`rocketride_service.run_pipeline`** (backend/app/services/rocketride_service.py:16-76):
  the question text it builds is hardcoded for *single-payment BEC screening*
  (`p.get('vendor_name')`, `p.get('amount')`, fabricated "Trusted vendor history" block with
  literal placeholder values `XXXX9999` / `ABCD0001234` / `150000–200000`). But
  `run_attack_chain_analysis` calls this same function with a **campaign-shaped payload**
  (`{"payments": [...], "exposure": ..., "evidence": [...]}`) that has no `vendor_name`,
  `amount`, `bank_account` keys — those all render as `None` in the prompt. The pipe's own
  agent instructions (see §4) also don't ask for campaign fields at all. This is a real,
  reproducible schema mismatch, not a hypothetical.
- **`run_attack_chain_analysis`** silently reads `rr_res.get("campaign_type")`,
  `.get("confidence")`, `.get("attack_stage")` from whatever the LLM returns, with no
  validation that these were grounded in supplied evidence — no verifier exists to check them
  (Phase 11 requirement).
- **Persistent memory**: campaigns are stored in SQLite, but nothing queries "has this account/
  requester appeared in a previous campaign?" when a new suspicious payment shows up. The data
  needed for Phase 9 exists; the retrieval logic doesn't.
- **`rr_client.py`**: dead code (unused `RocketRideDB` SQL-execution wrapper). Either delete or
  repurpose; leaving it creates confusion about which RocketRide path is "real."

## 4. Broken Components

- **RocketRide local engine is not reachable.** `netstat` shows nothing listening on
  `127.0.0.1:50661` (the `ROCKETRIDE_URI` in `.env`), and no RocketRide engine process is
  running. Every call to `RocketRideClient(...).connect()` will fail with a connection error —
  confirming the "Connect call failed" symptom. Ollama itself is healthy; the break is one hop
  earlier, at the RocketRide engine.
- Per `.rocketride/docs/ROCKETRIDE_README.md`, the local engine is one of "The Three Tools" and
  is backed by the **VSCode Extension** (visual pipeline builder / real-time monitoring). The
  installed `rocketride` CLI (`rocketride start/upload/status/stop/events/list/store`) is a
  *client* for talking to an already-running engine — it has no `serve`/`start-engine` command
  to bring the engine itself up headlessly. This means restoring connectivity most likely
  requires the RocketRide VSCode extension to be open/active against this workspace, which is a
  manual, human action outside what I can do from the CLI.
- **The pipe's declared output contract doesn't match what Phase 10 needs.** The agent
  instructions in `ap_sentinel_local.pipe` ask for
  `{"status": "CLEAR|FLAG", "riskScore": 0, "summary": "..."}`, not
  `{"campaign_type", "attack_stage", "confidence", "summary", "evidence", "recommended_action"}`.
  Even once the engine is reachable, campaign investigation calls would get back the wrong
  shape unless this is fixed.

## 5. Phase-by-Phase Comparison (vs. `RocketGuard_Final_Implementation_Plan.md`)

**PHASE 0 — Existing Project Audit**
Status: COMPLETE (this document)
Already implemented: n/a
Files: `CURRENT_SYSTEM_AUDIT.md`
Plan requires: classify everything WORKING/PARTIAL/MISSING/BROKEN
Gap: none
Required change: none

**PHASE 1 — Verify Neo4j**
Status: COMPLETE (Neo4j side) / BLOCKED (RocketRide engine side)
Already implemented: `neo4j` driver installed in `backend/venv`; Neo4j Aura Free instance
provisioned by the user; `NEO4J_URI`/`NEO4J_USER`/`NEO4J_PASSWORD` set in `.env`.
Verified 2026-08-29:
```
Neo4j connection: PASS
Node creation: PASS
Relationship creation: PASS
Query (Payment->Vendor): PASS
Multi-hop query (Payment->Account->Payment): PASS
Backend access: PASS (FastAPI reaches it directly via the neo4j driver)
RocketRide access: N/A by design — Neo4j is accessed directly from FastAPI per the plan's
own architecture diagram, not through RocketRide's db_neo4j node.
```
Remaining gap: the RocketRide local engine (`127.0.0.1:50661`) is still not reachable — confirmed
not listening even with Antigravity IDE and VS Code both running. Per
`.rocketride/docs/ROCKETRIDE_README.md` this requires the RocketRide extension to actually
activate on this workspace (opening the folder + a `.pipe` file), which is a manual step still
pending.
Required change: none for Neo4j. For RocketRide: user needs to get the extension to bind the
local engine to port 50661; then re-run a real `client.connect()` test before trusting any
AI-generated campaign output.

**PHASE 2 — Fraud Graph Schema**
Status: COMPLETE
Implemented in `backend/app/services/graph.py`: `Payment/Vendor/BankAccount/Requester/IFSC`
nodes; factual relationships `PAID_TO/USES_ACCOUNT/REQUESTED_BY/USES_IFSC` (idempotent MERGE);
derived relationships `SHARES_ACCOUNT/SHARES_REQUESTER/SHARES_VENDOR/TEMPORALLY_NEAR` written
with an `evidence` property, plus `Campaign`/`PART_OF`. Verified live: 110 Payment nodes, 110
PAID_TO/USES_ACCOUNT/REQUESTED_BY/USES_IFSC each, 10 SHARES_ACCOUNT, 10 SHARES_REQUESTER,
10 TEMPORALLY_NEAR, 4 Campaign nodes, 13 PART_OF — all against real imported data.

**PHASE 3 — Proper Data Foundation (Neo4j ingestion)**
Status: COMPLETE
`backend/scripts/import_datasets.py` now calls `sync_payments_to_neo4j` after the existing
SQLite import (unchanged), plus a campaign backfill step. Re-running the importer twice
produced identical Neo4j counts (verified) — safe to run repeatedly, per plan requirement.

**PHASE 4 — Dataset Strategy**
Status: PARTIAL
Already implemented: (A) existing JSON (`data/payments.json`, `vendors.json`,
`payment-history.json`) and 4 CSVs already used by `import_datasets.py`.
Plan requires: (A) JSON sources, (B) one public dataset (explicitly OPTIONAL), (C) ~5 synthetic
scenarios (normal / individual fraud / shared-account / cross-vendor / escalating).
Gap: (B) not integrated — acceptable, plan marks it optional. (C) `ground_truth_cases.csv`
likely encodes some of these already but hasn't been verified scenario-by-scenario.
Required change: spot-check `dataset_04_ground_truth_fraud_cases.csv` for scenario coverage;
add synthetic rows only for scenarios genuinely missing.

**PHASE 5 — Data Importer**
Status: PARTIAL
Already implemented: `backend/scripts/import_datasets.py` (CSV → SQLite, working, referenced by
100-payment baseline).
Plan requires: same importer also populate Neo4j.
Gap: no Neo4j target yet.
Required change: extend (not replace) `import_datasets.py` with a Neo4j-writing step, gated so
it can run safely if Neo4j is configured and skip cleanly if not.

**PHASE 6 — Individual Anomaly Detection**
Status: WORKING (deterministic, not via RocketRide's Anomaly Detector node)
Already implemented: `run_risk_adjudicator` — rule-based, no LLM-invented numbers.
Gap: plan prefers RocketRide's Anomaly Detector "if supported"; current deterministic version
already satisfies the actual hard requirement ("LLM must not invent anomaly evidence").
Required change: none required for correctness; optional swap only if time allows.

**PHASE 7 — Relationship Investigation**
Status: WORKING, but SQLite-based, not Neo4j-based
Already implemented: `run_attack_chain_analysis` (indexes, 72h window, edges with reasons).
Gap: plan wants this backed by Neo4j graph traversal.
Required change: once Neo4j exists, either move edge discovery into Cypher or keep the current
O(n+k) engine and additionally mirror results into Neo4j for graph queries/visualization —
plan explicitly says **preserve** the existing engine, so it should stay authoritative and
Neo4j should be an additional read/visualization layer, not a replacement.

**PHASE 8 — Dynamic Campaign Detection**
Status: WORKING and verified data-driven
Already implemented: Union-Find clustering over weighted edges; no scenario-ID branching found.
Gap: weights are hardcoded constants (`40/25/15/10`) inside the function rather than
configurable; plan calls for "configurable evidence weights."
Required change: minor — externalize weights (module-level constants or config), not a rewrite.

**PHASE 9 — Persistent Investigation Memory**
Status: COMPLETE (Neo4j-backed, not RocketRide's `memory_persistent` node)
`graph.get_historical_campaigns_for_entities()` queries prior `Campaign` associations by
shared bank account/requester/vendor. Wired into `run_attack_chain_analysis` — before creating
a new campaign, it now looks up whether any entity in the cluster already appeared in a past
campaign and appends that as an evidence line for RocketRide. Verified live: querying a known
account from an existing campaign correctly returns that campaign's id/type.

**PHASE 10 — RocketRide Investigation Agent**
Status: PARTIAL / effectively BROKEN end-to-end
Already implemented: pipe wiring (`chat → agent_rocketride → llm_ollama`), a call site
(`rocketride_service.run_pipeline`), a fallback path when the call fails.
Gap: (1) engine unreachable (Phase 1/Broken §4), so it has never actually executed for a
campaign; (2) prompt/output-schema mismatch (§3); (3) doesn't yet receive Neo4j relationships
or historical memory since neither exists; (4) the current fallback on exception creates a real
`AttackCampaign` row with `campaign_type="Deterministic Coordinated Fraud"`, `confidence=0` —
this is what produced the "false positive AI success" the baseline warned about: a campaign
row exists in the DB whether or not the LLM ever ran.
Required change: fix the prompt/schema, wire in real evidence once available, and make the
fallback visibly distinguishable in the API/UI as "AI unavailable" rather than a normal low-
confidence campaign.

**PHASE 11 — Verifier**
Status: COMPLETE
`backend/app/services/verifier.py` — `verify_campaign_claim()` checks: (1) every payment ID
mentioned in RocketRide's evidence/summary was actually supplied to it (catches invented IDs),
(2) confidence is a number in [0,100] (corrects to 0 otherwise), (3) required output fields are
present. Wired into both `run_attack_chain_analysis` and `investigate_payment`. Unit-verified
with a clean response (all PASS) and a fabricated one (invented payment ID + out-of-range
confidence, both correctly caught).

**PHASE 12 — Backend APIs**
Status: COMPLETE
Added `GET /api/payments/{id}`, `GET /api/campaigns/{id}`, `GET /api/campaigns/{id}/payments`,
`GET /api/campaigns/{id}/relationships`, `POST /api/payments/{id}/investigate` in `main.py`.
Verified live against the running server: all return real data (a campaign's actual payments
and their full Neo4j relationship/evidence graph — 18 edges with explicit evidence text for
campaign `3e8270e0-...`), and `/investigate` runs the full
anomaly → relationships → memory → RocketRide → verifier chain for a single payment on demand.
Existing endpoints unchanged.

**PHASE 13 — Frontend**
Status: COMPLETE
Added `frontend/src/pages/AttackIntelligence.tsx` (KPI tiles + campaign list) and
`CampaignDetail.tsx` (RocketRide assessment, connected payments, relationship evidence,
timeline), wired into `App.tsx` routing and the nav pill. Reused existing design system
(`kpi-card`, `workspace-dark`, `analytics-card`, `txn-row`) — no new visual language
introduced. Verified live in a real browser: EXPANDED mode correctly shows 3 real campaigns
with real exposure totals; a campaign's detail page correctly renders all 18 real relationship
edges with evidence text pulled from Neo4j.

**PHASE 14 — Investigation Interaction**
Status: COMPLETE
Added an "Investigate Payment" flow inside `Payments.tsx`'s detail panel
(`InvestigateSection`), using Framer Motion (already a dependency, previously unused) to
animate through the plan's exact step sequence before revealing the real result. Verified live
for both outcomes:
- A lone anomalous payment (no relationships/history) → "⚠ Individual fraud indicators found",
  no fabricated campaign verdict.
- A payment with real relationships → "🚨 COORDINATED ATTACK DETECTED", real connected
  payments, real evidence, a real "previous association detected" historical-memory hit, and a
  genuine live RocketRide/Ollama/Llama 3.2 assessment with a recommended action.

**Bug found and fixed during live testing:** `investigate_payment` originally called
RocketRide's campaign-investigation prompt even when there was zero relationship/historical
evidence, as long as the payment was individually anomalous. With an empty evidence list, the
LLM still produced a "campaign" judgment (`Coordinated Payment Campaign · 0% confidence`) for a
payment that has no network at all — a real instance of the exact failure mode the plan warns
against. Fixed in `backend/app/services/intelligence.py`: RocketRide is now only invoked when
there is actual relationship or historical evidence to reason over; anomaly-only cases report
deterministically as `INDIVIDUAL_FRAUD` with no campaign_result.

**PHASE 15 — End-to-End Testing**
Status: MISSING (formal)
Ad-hoc scripts exist at repo root (`check_ai.py`, `check_db2.py`, `check_scores.py`,
`test_auth.py`, `test.py`) suggesting prior manual verification, but no scenario checklist run
against the current code exists.

## 6. Files To Modify

- `backend/requirements.txt` — add `neo4j` driver.
- `.env` / `.env.example` — add `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` (or Aura token).
- `backend/app/services/rocketride_service.py` — fix campaign-analysis prompt/schema mismatch;
  likely split into `run_pipeline` (existing BEC screening) and a new investigation-specific
  call, or parameterize the question builder.
- `rocketride/ap_sentinel_local.pipe` — agent instructions must be extended/duplicated to
  produce the Phase-10 campaign JSON contract.
- `backend/app/services/intelligence.py` — extend `run_attack_chain_analysis` to pull
  historical-memory lookups and (once available) Neo4j relationship evidence; externalize
  weights.
- `backend/scripts/import_datasets.py` — extend with an optional Neo4j-writing step.
- `backend/app/main.py` — add the missing endpoints listed in §5 Phase 12.
- `frontend/src/lib/api.ts` — add client methods for the new endpoints.
- `backend/app/db/rr_client.py` — delete or repurpose (currently dead code).

## 7. New Files Required

- `backend/app/services/graph.py` — Neo4j driver wrapper (only once Neo4j is actually reachable).
- `backend/app/services/memory.py` — persistent-investigation-memory lookups (SQLite-backed
  first, per plan's explicit fallback allowance).
- `backend/app/services/verifier.py` — cross-checks RocketRide's structured claims against
  actual DB/graph evidence.
- `frontend/src/pages/AttackIntelligence.tsx`
- `frontend/src/pages/CampaignDetail.tsx`
- `FINAL_STATUS.md` (end of implementation, per plan §28).

## 8. Neo4j Requirements

- Connection method: RocketRide itself ships a generic `db_neo4j` pipeline node (Bolt URI +
  user/password or bearer token, default `neo4j://localhost:7687`), but that node's job is
  *natural-language question → Cypher via LLM* — not suited for deterministic writes/reads. The
  plan's own architecture diagram has **FastAPI talk to Neo4j directly**, with RocketRide only
  receiving already-computed relationship evidence. Recommendation: use the standard `neo4j`
  Python driver directly from FastAPI, not the RocketRide node.
- Credentials/env vars: **resolved** — `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` set in `.env`
  (Neo4j Aura Free instance).
- Existing Neo4j code: none yet beyond the ad-hoc verification script used for Phase 1 — the
  ingestion/query service (`backend/app/services/graph.py`) is still to be written (§7).
- Reachability: **confirmed reachable** — connection, node/relationship creation, single-hop
  and multi-hop queries all verified PASS on 2026-08-29.
- Manual configuration required: none remaining for Neo4j itself.

## 9. RocketRide Requirements

- Client usage: `rocketride` 1.3.0 installed in `backend/venv`; used via `RocketRideClient` in
  `rocketride_service.py` and (unused) `rr_client.py`.
- Pipeline: `rocketride/ap_sentinel_local.pipe` (local fallback pipe; `ap_sentinel.pipe` is the
  non-local variant, selected when `ROCKETRIDE_URI` is unset).
- Current URI: `http://127.0.0.1:50661` (from `.env`) — confirmed not listening.
- Engine startup issue: the local engine is run by the RocketRide **VSCode Extension**, not by
  a standalone server process or CLI `serve` command. No amount of backend-side retrying fixes
  this — it needs the extension active against this workspace.
- Ollama: confirmed running and listening on `127.0.0.1:11434`, matches the pipe's
  `llm_ollama_1` config (`model: llama3.2`). This part of the chain is healthy.
- Manual action required: user opens this project in VS Code with the RocketRide extension so
  the local engine binds to `127.0.0.1:50661`, then a `client.connect()` call can succeed.

## 10. Dataset Requirements

The 4 existing CSVs (100/48(51 imported)/27/100 rows) plus the 3 JSON files are sufficient for
the MVP, consistent with the plan's own guidance that the public dataset is optional. No need to
source an external dataset. Remaining dataset work is verifying/filling the 5 synthetic-scenario
coverage (Phase 4C) using what's already imported, not acquiring new data.

## 11. Time Risk

**MUST HAVE**
- RocketRide engine reachable + schema-correct campaign output (real execution, not fallback)
- Neo4j reachable + minimal fraud graph
- Relationship evidence flowing into the LLM call
- Dynamic campaign detection (already done)
- Attack Intelligence UI

**SHOULD HAVE**
- Persistent memory (historical association lookup)
- Verifier
- Graph/timeline visualization
- Configurable evidence weights

**NICE TO HAVE**
- Public dataset integration
- Extra fraud categories
- Advanced animations

Both MUST-HAVE infrastructure pieces (Neo4j, RocketRide engine) are currently blocked on
actions only the user can take on their machine — this is the dominant schedule risk, not the
application code itself.

## 12. Recommended Implementation Order

1. Resolve the two infra blockers in parallel with code work that doesn't depend on them:
   fix the `rocketride_service` prompt/schema bug now (§3/§5 Phase 10) so the moment the engine
   is reachable it works correctly.
2. Get a decision from the user on Neo4j (Desktop / Docker / Aura / defer-and-use-SQLite-
   fallback) and on starting the RocketRide VSCode extension.
3. Add `neo4j` driver + `backend/app/services/graph.py`; run the Phase 1 verification queries
   literally as specified in the plan (Payment→Vendor, Payment→Account→Payment).
4. Extend `import_datasets.py` to also populate Neo4j (Phase 2/3).
5. Add persistent-memory lookups (SQLite-backed, Phase 9) — independent of Neo4j, can happen
   any time.
6. Wire real evidence (anomaly + relationships + memory) into the investigation pipe call;
   add the verifier (Phase 10/11).
7. Add the missing backend endpoints (Phase 12).
8. Build the Attack Intelligence + Campaign Detail pages and the Investigate-Payment flow
   (Phase 13/14).
9. Run the Phase 15 scenario checklist and write `FINAL_STATUS.md`.
