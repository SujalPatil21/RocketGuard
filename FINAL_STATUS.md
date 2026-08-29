# FINAL_STATUS.md

Status as of 2026-08-29. See `CURRENT_SYSTEM_AUDIT.md` for the full phase-by-phase detail this
summarizes.

## Phase Completion

```
PHASE 0  — Existing Project Audit ............ COMPLETED
PHASE 1  — Verify Neo4j ...................... COMPLETED (Neo4j side); RocketRide engine
                                                reachability is environment-dependent, see below
PHASE 2  — Fraud Graph Schema ................. COMPLETED
PHASE 3  — Proper Data Foundation ............. COMPLETED
PHASE 4  — Dataset Strategy ................... COMPLETED (public dataset intentionally skipped
                                                — optional per plan, existing data sufficient)
PHASE 5  — Data Importer ...................... COMPLETED
PHASE 6  — Individual Anomaly Detection ....... COMPLETED (pre-existing, deterministic)
PHASE 7  — Relationship Investigation ......... COMPLETED
PHASE 8  — Dynamic Campaign Detection ......... COMPLETED (pre-existing, verified data-driven)
PHASE 9  — Persistent Investigation Memory .... COMPLETED (Neo4j-backed)
PHASE 10 — RocketRide Investigation Agent ..... COMPLETED (schema fixed; verified with real
                                                Llama 3.2 responses in this session)
PHASE 11 — Verifier ........................... COMPLETED
PHASE 12 — Backend APIs ....................... COMPLETED
PHASE 13 — Frontend ........................... COMPLETED
PHASE 14 — Investigation Interaction .......... COMPLETED
PHASE 15 — End-to-End Testing ................. PARTIAL — see below
```

## Phase 15 — What Was Actually Tested

Tested live, in a real browser, against the live backend:
- Normal / individual-fraud / coordinated-attack verdicts via the Investigate flow
- EXPANDED mode (100 payments) and DEMO mode (10 payments), including Reset Demo
- Attack Intelligence list + Campaign Detail pages against real campaigns
- A full real RocketRide → Ollama → Llama 3.2 round trip (twice: single-payment BEC schema and
  campaign-investigation schema), independently corroborated via the RocketRide extension's own
  event log and `ollama ps`
- Persistent memory retrieval (a real account correctly surfaced its prior campaign)
- Verifier logic (unit-tested against both a clean and a fabricated LLM response)

Not run as a scripted, repeatable suite: the plan's full 17-item Phase 15 checklist (e.g.
authentication regression, dataset-join validation reruns) was exercised ad hoc during
development, not codified into a test script. If a real, repeatable regression suite matters
going forward, that's the next thing to add — none exists today (only ad-hoc root-level scripts
like `check_ai.py`, `test_auth.py`).

## RocketRide Status

**Root cause of the original "Connect call failed (50661)" was a stale port.** The local
engine binds a dynamic OS-assigned port (`--port=0`) each time it starts — it is not fixed.
`.env`'s `ROCKETRIDE_URI` had captured a value from a previous session that no longer matched
any running engine.

**This session verified genuine, non-fallback execution twice** — once through direct pipeline
calls (found the live port via the RocketRide extension's own output log, corroborated by
`apaevt_task` events and `ollama ps` showing `llama3.2` loaded), and again live in the browser
through the Investigate flow.

**This is not a permanent fix.** The port will change again the next time the engine restarts
(IDE reload, machine restart, crash). Whoever runs this next needs to:
1. Have the RocketRide extension active on this workspace (open the folder + a `.pipe` file in
   Antigravity or VS Code) so the local engine actually binds a port.
2. Find the current port — read the newest
   `...\Antigravity IDE\logs\<session>\window*\exthost\output_logging_*\*-Rocket Ride Extension.log`
   for a line like `✅ Engine ready (port NNNNN)`.
3. Update `ROCKETRIDE_URI=http://127.0.0.1:NNNNN` in `.env`.

Also note: **Ollama unloads the model after a few minutes of idle time**, so the first
investigate/screen-batch call after any pause will have a genuine cold-start delay
(observed: ~30–40 seconds) before Ollama reloads `llama3.2` — this is expected, not a hang.

Fixed this session: the pipe's agent prompt (`rocketride/ap_sentinel_local.pipe` and
`ap_sentinel.pipe`) only knew how to produce single-payment BEC output; it now also produces the
campaign-investigation JSON schema (`campaign_type/attack_stage/confidence/summary/evidence/
recommended_action`), matched by `rocketride_service.py`'s question-builder.

## Neo4j Status

Live and verified: Neo4j Aura Free instance, credentials in `.env`
(`NEO4J_URI`/`NEO4J_USER`/`NEO4J_PASSWORD`). 110 payments imported with factual relationships
(`PAID_TO/USES_ACCOUNT/REQUESTED_BY/USES_IFSC`); derived relationships
(`SHARES_ACCOUNT/SHARES_REQUESTER/TEMPORALLY_NEAR`) are written whenever the deterministic
relationship engine finds them; campaigns are mirrored as `Campaign`/`PART_OF`. Free-tier Aura
instances auto-pause after a period of inactivity — if graph calls start failing after a long
gap, check the Aura console and resume the instance.

## Dataset Status

4 CSVs in `backend/datasets/` (100/48/27/100 rows) + 3 JSON files in `data/`, already imported.
No external public dataset was added — deliberately, per the plan's own guidance that it's
optional and the existing data is sufficient.

## Known Limitations / Bugs

- **LLM confidence calibration is inconsistent.** Llama 3.2 (a small local model) sometimes
  pairs a strong verbal claim ("highly suspicious") with a low numeric confidence (observed:
  1%, 5%). The verifier checks the number is a valid 0–100 value but does not (and structurally
  cannot, without another LLM call) check that the number matches the tone of the summary. This
  is a model-quality limitation, not an application bug.
- **`backend/app/db/rr_client.py` is dead code** (an earlier "RocketRide SQL" approach the plan
  explicitly says to abandon). Left in place rather than deleted, since removing unrelated code
  wasn't in scope this session — worth cleaning up.
- **Duplicate risk-signal text**: `run_risk_adjudicator` can attach the same reason string more
  than once for a payment (observed 3x "Beneficiary bank account does not match vendor
  profile." on one payment) — pre-existing behavior, not touched this session.
- Aura's free-tier auto-pause (see above) is the most likely thing to break the graph-backed
  features (relationships, persistent memory) if this project sits idle for a while.

## Manual Setup Required

- Backend venv: `backend/venv` (already provisioned in this repo).
- `neo4j` Python package: installed this session (`pip install neo4j`, also added to
  `backend/requirements.txt`).
- `.env` must have `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` (Aura) and a currently-correct
  `ROCKETRIDE_URI` (see RocketRide Status above — this one needs periodic manual correction).

## Run Commands

```
# Backend
cd backend
./venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 5001

# Frontend
cd frontend
npm run dev
```

## Import / Reset Commands

```
# Re-import CSV datasets into SQLite + sync into Neo4j (safe to re-run, idempotent)
cd backend
./venv/Scripts/python.exe scripts/import_datasets.py

# Reset the 10-payment DEMO subset only (does not touch EXPANDED data or auth)
POST /api/reset-demo   (or click "Reset Demo" if such a button exists in the UI — currently
                        only reachable via the API in this codebase)
```

## Demo Procedure

1. Sign in with `demo@apsentinel.com`.
2. Switch to EXPANDED mode (top-right toggle).
3. Go to Payments, open any `PENDING` payment with a real cluster (e.g. `PAY-000091`), click
   **Investigate Payment**. Wait through the step animation — if Ollama needs to cold-start the
   model, this can take up to ~40 seconds on the first call.
4. Observe: anomaly signals → connected payments (real Neo4j evidence) → previous-campaign
   association (if any) → RocketRide's live assessment → recommended action.
5. Go to **Attack Intel** in the nav to see the full campaign list and exposure totals; click
   into a campaign for the full relationship-evidence graph and timeline.
