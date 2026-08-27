# AP Sentinel

## Problem
Accounts Payable teams are targeted by sophisticated fraud and Business Email Compromise (BEC) attacks. Traditional rule-based systems struggle to detect context-aware anomalies (like subtle impersonation and urgency), allowing fraudulent payments to slip through before being flagged.

## Solution
AP Sentinel is an AI-powered Accounts Payable fraud-screening system that screens vendor payment requests before money moves. It cross-checks suspicious activity using specialist AI agents, generates safe out-of-band verification instructions, and requires human approval before a held payment can be approved.

## Why RocketRide
RocketRide is a mandatory and load-bearing technology for this project. Instead of creating a monolithic LLM call, RocketRide orchestrates the specific, specialized AI agents (History Checker, Pattern Matcher, Verifier). It manages the pipeline, the data lanes, and model inference directly.

## Architecture
- **Frontend**: Cloudflare Pages (React + Vite + Tailwind CSS + Framer Motion)
- **Backend**: Railway (FastAPI + Pydantic)
- **Database**: PostgreSQL on Railway (Authentication: OTP via SMTP)
- **AI Orchestration**: RocketRide Cloud (via RocketRide Python SDK)
- **Inference**: Gemini
- **Data**: In-memory demo state with robust synthetic JSON dataset

*(Note: Local development uses Ollama + llama3.2 and SQLite instead of Gemini and PostgreSQL.)*

## Three Agents
1. **History Checker**: Compares incoming payments against trusted vendor histories.
2. **Pattern Matcher**: Detects fraud, urgency, and BEC patterns.
3. **Verifier**: Generates safe, out-of-band verification instructions without relying on the potentially compromised payment request info.

## Batch Processing
The app screens a batch of ~20 synthetic payment requests synchronously through the RocketRide pipeline. Results are parsed and deterministic backend logic determines the safety score and whether human intervention is needed.

## Setup Instructions

### Environment
1. Clone the repository.
2. The project contains a `backend` and a `frontend` directory.

### RocketRide Local
1. Ensure RocketRide local extension is installed and running.
2. Set environment variables if needed (`ROCKETRIDE_URI`, `ROCKETRIDE_APIKEY`). The backend uses the official RocketRide Python SDK (`v1.3.0`) and explicitly connects to `http://localhost:5565` for the local runtime.
3. Install Ollama and run `ollama pull llama3.2`.

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Running the Demo
1. Open the frontend in the browser (usually `http://localhost:5173`).
2. Click **SCREEN BATCH** on the Overview page.
3. View the processed payments in the Payments tab.
4. Click on held payments (such as `INV-015` or `INV-016`) to view detailed Agent Reasoning and approve/reject them.
5. Check the Activity tab to trace pipeline steps and system audit trails.

## Future Improvements
- OCR parsing from invoices.
- RocketRide Cloud integration.
- Continuous learning loop for FP/TP feedback.
