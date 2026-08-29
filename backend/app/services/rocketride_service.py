import asyncio
import os
import json
import re
from dotenv import load_dotenv
from rocketride import RocketRideClient
from rocketride.schema import Question
from typing import Dict, Any

_env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    ".env"
)
load_dotenv(_env_path, override=True)

def get_pipe_filename() -> str:
    """LOCAL uses Ollama/llama3.2; PRODUCTION (ROCKETRIDE_PROVIDER=groq) uses Groq."""
    if os.environ.get("ROCKETRIDE_PROVIDER", "local").strip().lower() == "groq":
        return "ap_sentinel_groq.pipe"
    return "ap_sentinel_local.pipe"

async def run_pipeline(pipe_path: str, payment_data: Dict[str, Any]) -> Dict[str, Any]:
    uri = os.environ.get("ROCKETRIDE_URI")
    client = RocketRideClient(uri=uri) if uri else RocketRideClient()
    
    try:
        await client.connect(os.environ.get("ROCKETRIDE_APIKEY"))
    except Exception as e:
        raise RuntimeError(f"RocketRide pipeline connection error: {e}")
        
    token = None
    try:
        result = await client.use(filepath=pipe_path, source='chat_1')
        token = result.get('token')
        if not token:
            raise RuntimeError("No token returned from pipeline use.")
        
        question = Question(expectJson=True)
        p = payment_data.get("payment", {})

        if payment_data.get("campaign_analysis"):
            # Campaign investigation: supply only deterministic evidence, nothing invented.
            question_text = "Investigate this coordinated payment campaign for fraud.\n\n"
            question_text += f"Payments involved: {', '.join(p.get('payments', []))}\n"
            question_text += f"Total exposure: {p.get('exposure')}\n\n"
            question_text += "Relationship evidence:\n"
            for e in p.get("evidence", []):
                question_text += f"- {e}\n"
            question_text += "\nUsing ONLY the evidence above, return only the final campaign assessment."
            question.addExample(
                "Investigate a campaign with 2 linked payments",
                {
                    "campaign_type": "Coordinated Vendor Payment Fraud",
                    "attack_stage": "PAYMENT_MANIPULATION",
                    "confidence": 80,
                    "summary": "Two payments share a bank account and requester within a short window.",
                    "evidence": ["Both payments use the same bank account."],
                    "recommended_action": "Hold payments pending manual review.",
                },
            )
        else:
            # Single-payment BEC screening
            question_text = f"Analyze this payment for fraud:\n\n"
            question_text += f"Vendor: {p.get('vendor_name')}\n"
            question_text += f"Amount: {p.get('amount')}\n"
            question_text += f"Bank Account: {p.get('bank_account')}\n"
            question_text += f"IFSC: {p.get('ifsc')}\n"
            question_text += f"Requested by: {p.get('requested_by', 'Finance Operations')}\n"
            question_text += f"Message: \"{p.get('request_message', 'Please process this payment urgently today.')}\"\n\n"
            question_text += f"Trusted vendor history:\n"
            question_text += f"- Bank Account: XXXX9999\n"
            question_text += f"- IFSC: ABCD0001234\n"
            question_text += f"- Normal payment range: INR 150000–200000\n"
            question_text += f"- No recent bank changes\n\n"
            question_text += f"Return only the final screening result."

        question.addQuestion(question_text)
        
        async def on_sse(event_type, data):
            pass
            
        response = await client.chat(token=token, question=question, on_sse=on_sse)
        raw_answer = response.get('answers', [{}])[0]
        
        parsed = {}
        if isinstance(raw_answer, dict):
            parsed = raw_answer
        else:
            cleaned = raw_answer
            if isinstance(cleaned, str) and cleaned.startswith("LLM error:"):
                raise RuntimeError(f"RocketRide agent could not produce a valid response: {cleaned}")
            if '```json' in cleaned:
                cleaned = re.search(r'```json\s*(.*?)\s*```', cleaned, re.DOTALL).group(1)
            elif '```' in cleaned:
                cleaned = re.search(r'```\s*(.*?)\s*```', cleaned, re.DOTALL).group(1)
            parsed = json.loads(cleaned)
            
        return parsed
    finally:
        if token:
            try:
                await client.terminate(token=token)
            except Exception:
                pass
        await client.disconnect()
