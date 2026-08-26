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
        
        # Prepare actual request payload text
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
