# AP Sentinel — Installation & Run Cheat Sheet

AI-powered Accounts Payable fraud screening using RocketRide + Ollama.

## 1. Prerequisites
Ensure you have the following installed on your Windows machine:
- Windows
- Git
- Python 3.10+
- Node.js 18+ / npm
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

## 4. Environment Setup
The project uses environment variables to configure auth, database, and RocketRide connection.
1. Copy the example `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Fill in the `.env` values.
   - `DEMO_MODE=true` will bypass SMTP and print OTPs to the console.
   - `ROCKETRIDE_URI` and `ROCKETRIDE_APIKEY` must point to your RocketRide local instance.

## 5. Backend (FastAPI)
The backend manages the AP Sentinel API, Auth, and interacts with the RocketRide pipeline.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the demo database:
   ```bash
   python -m app.auth.seed_demo_user
   ```
   *(By default, this creates a `demo_reviewer` user with the email `demo@apsentinel.com`. See console output for details.)*
5. Start the backend server:
   ```bash
   uvicorn app.main:app --port 8000
   ```
Backend API will be available at `http://localhost:8000`.

## 6. Frontend (React/Vite)
The frontend provides the AP Sentinel UI.

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
Frontend UI will be available at `http://localhost:5173`.

## 7. Demo Flow
1. Open your browser to the local frontend URL (typically `http://localhost:5173`).
2. Log in using the demo credentials created during the seed step (`demo@apsentinel.com` / see `.env`).
3. If `DEMO_MODE=true` is set, check your backend server console for the generated OTP to complete the login.
4. Click **SCREEN BATCH** on the Overview page.
5. The batch processes synthetic pending payments through the pipeline resulting in **CLEAR**, **HELD**, or **UNPROCESSABLE** statuses.
6. Click **REVIEW** on a HELD payment to view the AI analysis.
7. Click **APPROVE** or **REJECT** to process the payment and update the audit log.

## 8. Important Rules
- **All payment data is synthetic.**
- **No real money moves.**
- Ollama uses `llama3.2`.
- RocketRide is a real runtime dependency.

## 9. Quick Troubleshooting
- **Ollama model missing:** Run `ollama pull llama3.2`
- **RocketRide not connected:** Go to RocketRide Settings → Local → Reconnect.
- **Frontend build/import errors:** Run `npm run build` from the `frontend` directory.
