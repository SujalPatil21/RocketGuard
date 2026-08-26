# AP Sentinel — Installation & Run Cheat Sheet

AI-powered Accounts Payable fraud screening using RocketRide + Ollama.

## 1. Prerequisites
Ensure you have the following installed on your Windows machine:
- Windows
- Git
- Python
- Node.js / npm
- Ollama
- Antigravity / VS Code
- RocketRide extension (Antigravity/VS Code)

## 2. Ollama
Install Ollama for Windows and verify the installation:
```bash
ollama --version
```

Pull the exact model used by AP Sentinel:
```bash
ollama pull llama3.2
```

Verify it downloaded correctly:
```bash
ollama list
```

Test the model (Type "READY" when prompted):
```bash
ollama run llama3.2
```

Ollama must remain running locally (API available at `http://127.0.0.1:11434`). Do NOT install or substitute another model.

## 3. RocketRide
RocketRide is a real runtime dependency and is NOT mocked. The pipeline definition is located at `rocketride/ap_sentinel.pipe`.

1. Install the RocketRide extension in Antigravity/VS Code.
2. Open the Rocket project root in the editor.
3. Open RocketRide Settings.
4. Go to **Development** → Connection mode: **Local**.
5. Save & Connect.
6. Confirm the status bar says: **RocketRide: Connected (Local)**.
*Note: Do NOT hardcode a RocketRide port. It uses a dynamic port configuration.*

## 4. Backend (FastAPI)
The backend manages the AP Sentinel API and interacts with the RocketRide pipeline.

```bash
cd server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```
Backend API will be available at `http://localhost:8000`.

## 5. Frontend (React/Vite)
The frontend provides the AP Sentinel UI.

```bash
cd client
npm install
npm run dev
```
Frontend UI will be available at `http://localhost:5173`.

## 6. Environment Variables
The project uses environment variables to connect to RocketRide. 
A real `.env` contains local secrets and must **NOT** be committed. API keys must never be pasted into chat or GitHub.

Required variables:
- `ROCKETRIDE_URI`
- `ROCKETRIDE_APIKEY`

*(If a `.env.example` does not exist, a safe example file should be created later. Do not hardcode real values into example files.)*

## 7. Demo Flow
1. Click **SCREEN BATCH** on the Overview page.
2. The batch processes synthetic pending payments through the pipeline resulting in **CLEAR**, **HELD**, or **UNPROCESSABLE** statuses.
3. Click **REVIEW** on a HELD payment to view the AI analysis.
4. Click **APPROVE** or **REJECT** to process the payment and update the audit log.

## 8. Important Rules
- **All payment data is synthetic.**
- **No real money moves.**
- Ollama uses `llama3.2`.
- RocketRide is a real runtime dependency.

## 9. Quick Troubleshooting
- **Ollama model missing:** Run `ollama pull llama3.2`
- **RocketRide not connected:** Go to RocketRide Settings → Local → Reconnect.
- **Frontend build/import errors:** Run `npm run build` from the `client` directory.
