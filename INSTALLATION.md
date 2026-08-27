# AP Sentinel — Installation & Run Cheat Sheet

AI-powered Accounts Payable fraud screening using RocketRide + Ollama (Local) / Gemini (Production).

## LOCAL DEVELOPMENT

### 1. Prerequisites
Ensure you have the following installed on your Windows machine:
- Windows
- Git
- Python 3.10+
- Node.js 18+ / npm
- Ollama
- Antigravity / VS Code
- RocketRide extension (Antigravity/VS Code)

### 2. Ollama
Install Ollama for Windows and verify the installation:
```bash
ollama --version
```

Pull the exact model used by AP Sentinel:
```bash
ollama pull llama3.2
```

Ollama must remain running locally (API available at `http://127.0.0.1:11434`). Do NOT install or substitute another model.

### 3. RocketRide Local
RocketRide is a real runtime dependency and is NOT mocked. The pipeline definition is located at `rocketride/ap_sentinel.pipe`.

1. Install the RocketRide extension in Antigravity/VS Code.
2. Open the Rocket project root in the editor.
3. Open RocketRide Settings.
4. Go to **Development** → Connection mode: **Local**.
5. Save & Connect.
6. Confirm the status bar says: **RocketRide: Connected (Local)**.

### 4. Environment Setup
1. Copy the example `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Fill in the `.env` values under `LOCAL DEVELOPMENT ONLY`.
   - `DEMO_MODE=true` will bypass SMTP and print OTPs to the console.
   - `ROCKETRIDE_URI` and `ROCKETRIDE_APIKEY` must point to your RocketRide local instance.

### 5. Backend (FastAPI)
1. Navigate to the backend directory: `cd backend`
2. Create and activate a Python virtual environment.
3. Install dependencies: `pip install -r requirements.txt`
4. Seed the demo database: `python -m app.auth.seed_demo_user`
5. Start the backend server: `uvicorn app.main:app --port 8000`

### 6. Frontend (React/Vite)
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

---

## PRODUCTION DEPLOYMENT

### 1. Overview
- **Frontend**: Cloudflare Pages
- **Backend**: Railway
- **Database**: PostgreSQL on Railway
- **RocketRide**: RocketRide Cloud
- **LLM**: Gemini
- **Authentication**: OTP via SMTP

### 2. Environment Setup
Fill in the `.env` values under `PRODUCTION DEPLOYMENT ONLY` on your respective platforms (Railway for backend, Cloudflare Pages for frontend).
- Do **not** set `ROCKETRIDE_URI` in production. The RocketRide client will default to Cloud.
- Set `ROCKETRIDE_APIKEY` to your production RocketRide API Key.
- Ensure `DEMO_MODE=false` and SMTP details are correctly provided.

### 3. Backend (Railway)
- Deploy the `backend` folder to Railway.
- Use PostgreSQL plugin on Railway and set `DATABASE_URL`.
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Set `CORS_ORIGINS` to your frontend's public URL (e.g. `https://ap-sentinel.pages.dev`).

### 4. Frontend (Cloudflare Pages)
- Build Command: `npm run build`
- Build Output Directory: `dist/`
- Environment Variables:
  - `VITE_API_BASE_URL` = `https://your-backend.up.railway.app`

### 5. RocketRide Cloud
- Deploy `rocketride/ap_sentinel.pipe` to RocketRide Cloud.
- Ensure the pipeline is configured to use a `llm_gemini` node with Gemini credentials securely supplied.

## Important Rules
- **All payment data is synthetic.** No real money moves.
- Keep the local Ollama+llama3.2 pipeline separated from the Production Gemini pipeline.
