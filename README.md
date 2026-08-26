# RocketGuard

### AI-Powered Protection for Business Payments

RocketGuard is an AI-powered Accounts Payable (AP) payment protection system that screens business payment requests for suspicious activity before money moves.

It combines **multi-agent AI screening**, **vendor-history cross-checking**, **out-of-band verification**, and a **human-in-the-loop safety gate** to turn suspicious payment activity into actionable and auditable decisions.

> **Note:** RocketGuard uses synthetic payment data for demonstration purposes. No real money is moved.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [RocketRide AI Pipeline](#rocketride-ai-pipeline)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Demo Flow](#demo-flow)
- [Risk Decision Flow](#risk-decision-flow)
- [Security](#security)
- [Demo Data](#demo-data)
- [Future Scope](#future-scope)
- [Limitations](#limitations)
- [Contributing](#contributing)


---

## Overview

Business payment fraud can involve more than simple rule violations.

Attackers may use:

- Vendor impersonation
- Bank-account changes
- Unusual payment amounts
- Urgent payment requests
- Business Email Compromise (BEC)
- Conflicting information between a payment request and trusted vendor history

RocketGuard analyzes payment requests using multiple specialist AI agents and combines their results with deterministic application logic.

Each payment is classified as:

- `CLEAR`
- `HELD`
- `UNPROCESSABLE`

A `HELD` payment is routed to human review before an approval or rejection decision is recorded.

---

## Key Features

### Multi-Agent Cross-Checking

RocketGuard uses multiple specialist AI agents instead of relying on a single AI call.

- **History Checker** — compares payment information against trusted vendor history.
- **Pattern Matcher** — detects suspicious patterns such as urgency, fraud indicators, and BEC behavior.
- **Verifier** — generates safe out-of-band verification instructions.

### Agent Disagreement Detection

When specialist agents produce conflicting results, the disagreement can be treated as a risk signal and routed toward human review.

### Out-of-Band Verification

Verification uses trusted vendor information rather than relying entirely on potentially compromised information contained inside the payment request.

### Human-in-the-Loop Safety Gate

AI can identify and hold a suspicious payment, but it cannot autonomously release a held payment.

A human reviewer explicitly chooses:

- `APPROVE`
- `REJECT`

### Deterministic Final Decision

The final payment safety decision is determined by application logic using the AI screening results rather than allowing an LLM to independently authorize payment release.

### Batch-Native Fraud Screening

RocketGuard processes a batch of approximately 20 synthetic payment requests through the RocketRide pipeline in one workflow.

### Auditable Decisions

Review actions and approval/rejection decisions are recorded so that payment decisions can be traced.

---

## How It Works

```text
Payment Batch
      |
      v
Backend Services
      |
      v
RocketRide AI Pipeline
      |
      +----------------------+
      |                      |
      v                      v
History Checker       Pattern Matcher
      |                      |
      +----------+-----------+
                 |
                 v
              Verifier
                 |
                 v
        AI Screening Results
                 |
                 v
       Deterministic Decision
                 |
        +--------+--------+
        |        |        |
        v        v        v
      CLEAR    HELD   UNPROCESSABLE
                 |
                 v
            Human Review
                 |
          +------+------+
          |             |
          v             v
       APPROVE        REJECT
                 |
                 v
            Audit Trail

# RocketRide AI Pipeline

RocketRide is a load-bearing component of RocketGuard. Rather than making a single monolithic LLM call, RocketRide orchestrates the specialist AI agents, their data flow, and model inference.

---

## Agents

| Agent | Responsibility |
| --- | --- |
| **History Checker** | Compares payment details against trusted vendor history |
| **Pattern Matcher** | Detects fraud, urgency, impersonation, and BEC patterns |
| **Verifier** | Generates safe out-of-band verification instructions |

---

## Pipeline

The RocketRide pipeline is defined in: `rocketride/ap_sentinel.pipe`

RocketGuard uses the RocketRide Python SDK to communicate with the pipeline.

---

## Technology Stack

* **Frontend:** React, Vite, Tailwind CSS, Framer Motion
* **Backend:** Python, FastAPI, Pydantic, Uvicorn
* **AI & Orchestration:** RocketRide Python SDK, RocketRide Pipeline, Ollama, llama3.2
* **Data:** PostgreSQL, Synthetic JSON datasets, In-memory application state
* **Authentication:** JWT-based authentication, OTP verification, Password recovery

---

## Architecture

```text
                         +----------------+
                         |      User      |
                         +-------+--------+
                                 |
                                 v
                       +-------------------+
                       |  Security Layer   |
                       | Authentication    |
                       | JWT / OTP         |
                       +---------+---------+
                                 |
                                 v
                       +-------------------+
                       |  Web Application  |
                       +---------+---------+
                                 |
                                 v
                    +-------------------------+
                    |    Backend Services     |
                    |                         |
                    |    Core Services        |
                    |          |              |
                    |          v              |
                    |  RocketRide Pipeline    |
                    |          |              |
                    |          v              |
                    |     AI Screening        |
                    |          |              |
                    |          v              |
                    |    Human Review         |
                    |          |              |
                    |          v              |
                    |    Audit / Logging      |
                    +------------+------------+
                                 |
                                 v
                       +-------------------+
                       |    Data Layer     |
                       | PostgreSQL        |
                       | JSON Data         |
                       | Application State |
                       +-------------------+

```

---

## Project Structure

```text
rocketguard/
│
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── db/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
├── data/
│   ├── payments.json
│   ├── vendors.json
│   └── payment-history.json
│
├── rocketride/
│   └── ap_sentinel.pipe
│
├── .env.example
├── .gitignore
└── README.md

```

---

## Prerequisites

Before running RocketGuard, install:

* Git
* Python
* Node.js / npm
* Ollama
* VS Code or a compatible editor
* RocketRide extension


## Installation

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd rocketguard

```

### 2. Set Up Ollama

Verify Ollama is installed:

```bash
ollama --version

```

Pull the required model:

```bash
ollama pull llama3.2

```

Verify the model was pulled successfully:

```bash
ollama list

```

Run the model when required:

```bash
ollama run llama3.2

```

### 3. Configure RocketRide

RocketRide is a real runtime dependency and is not mocked.

1. Install the RocketRide extension.
2. Open the RocketGuard project.
3. Open RocketRide settings.
4. Select the local development connection mode.
5. Connect the RocketRide runtime.
6. Verify that RocketRide shows as connected.

> **Note:** The pipeline is located at: `rocketride/ap_sentinel.pipe`

### 4. Backend Setup

Navigate to the backend directory:

```bash
cd backend

```

Create a virtual environment:

```bash
python -m venv venv

```

Activate it on Windows:

```bash
venv\Scripts\activate

```

Install dependencies:

```bash
pip install -r requirements.txt

```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000

```

The backend will be available at: `http://localhost:8000`

### 5. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend

```

Install dependencies:

```bash
npm install

```

Start the frontend:

```bash
npm run dev

```

The frontend will normally be available at: `http://localhost:5173`

---

## Environment Variables

Create a `.env` file using `.env.example`. Example:

```env
ROCKETRIDE_URI=http://127.0.0.1:<PORT>
ROCKETRIDE_APIKEY=your-api-key-here

```

> **Security Warning:** Do not commit `.env` to GitHub. Never expose API keys, database credentials, JWT secrets, or other private credentials. Use `.env.example` for safe placeholder values.

## Running the Application

Start the required services:

### Ollama

```bash
ollama run llama3.2

```

### Backend

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

```

### Frontend

```bash
cd frontend
npm run dev

```

### RocketRide

Ensure the RocketRide local runtime is connected through the RocketRide extension.

---

## Demo Flow

1. Open the RocketGuard frontend.
2. Sign in through the authentication flow.
3. Open the Overview/Dashboard.
4. Click **SCREEN BATCH**.
5. The synthetic payment batch is sent through the RocketRide pipeline.
6. Review the resulting payment statuses.
7. Open a **HELD** payment.
8. Inspect the AI analysis and verification information.
9. Select **APPROVE** or **REJECT**.
10. Review the resulting audit activity.

**Example scenarios include:** Bank-account mismatch, Urgent payment request, Vendor impersonation, Abnormal payment amount, and Agent disagreement.
## Risk Decision Flow

```text
                 Payment Request
                        |
                        v
               Multi-Agent Analysis
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
       History       Pattern       Verifier
       Checker       Matcher
          |             |             |
          +-------------+-------------+
                        |
                        v
               Deterministic Logic
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
       CLEAR          HELD      UNPROCESSABLE
                        |
                        v
                  Human Review
                   /         \
                  v           v
              APPROVE       REJECT

```

---

## Security

RocketGuard includes an authentication layer for protected application access. The authentication flow supports:

* User registration
* Login
* OTP verification
* OTP resend
* Password reset
* JWT authentication
* Current-user validation

Protected backend functionality uses authenticated-user validation rather than implementing separate authentication mechanisms.

---

## Demo Data

RocketGuard uses synthetic payment data for the demonstration. The dataset contains:

* Payment requests
* Vendor information
* Payment history
* Clean payment scenarios
* Suspicious payment scenarios
* Fraud-oriented test cases

Example fraud scenarios include: Bank-account mismatches, Urgent payment requests, Vendor impersonation, Abnormal transaction amounts, and Conflicting agent signals.

> **Note:** No real payment data is used and no real money is moved.

---

## Future Scope

* **Continuous Learning Loop:** Use confirmed fraud and false-positive outcomes to improve future risk detection.
* **Invoice OCR & Document Intelligence:** Extract and validate payment information directly from invoices and supporting documents.
* **Real-Time Payment Monitoring:** Extend batch screening into continuous monitoring of incoming payment requests.
* **RocketRide Cloud Integration:** Move from local execution toward scalable cloud-based AI orchestration.
* **Advanced Fraud Pattern Detection:** Expand detection of complex BEC, impersonation, and transaction anomalies.

---

## Limitations

* Payment data is currently synthetic.
* RocketGuard is a fraud-screening and decision-support prototype.
* No real payment transaction is executed.
* The current workflow is batch-oriented.
* Local AI inference requires Ollama.
* Local AI orchestration requires the RocketRide runtime.
* Production deployment would require additional infrastructure, monitoring, compliance, secrets management, and integration with real payment systems.

---

## Contributing

1. Fork the repository.
2. Create a feature branch:
```bash
git checkout -b feature/your-feature

```


3. Make your changes.
4. Test the application.
5. Commit your changes:
```bash
git commit -m "feat: add your feature"

```


6. Push your branch:
```bash
git push origin feature/your-feature

```


7. Open a Pull Request.
