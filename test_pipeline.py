import asyncio
import json
import os
from urllib.parse import urlparse

# Try to load the .env explicitly from the workspace root
env_path = 'C:/Github/Rocket/.env'
env_exists = os.path.exists(env_path)
if env_exists:
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip()

uri = os.environ.get('ROCKETRIDE_URI')
apikey = os.environ.get('ROCKETRIDE_APIKEY')

uri_present = "YES" if uri else "NO"
apikey_present = "YES" if apikey else "NO"
uri_host = ""
uri_port = ""
if uri:
    try:
        parsed = urlparse(uri)
        uri_host = parsed.hostname
        uri_port = parsed.port
    except Exception:
        pass

print(f"ROOT_ENV_EXISTS={'YES' if env_exists else 'NO'}")
print(f"ROCKETRIDE_URI_PRESENT={uri_present}")
if uri_present == "YES":
    print(f"URI_HOST={uri_host}")
    print(f"URI_PORT={uri_port}")
print(f"APIKEY_PRESENT={apikey_present}")
print("---")

from rocketride import RocketRideClient
from rocketride.schema import Question
import re

async def run_case(client, name, question_text):
    print(f"\n=========================================")
    print(f"RUNNING {name.upper()} CASE")
    print(f"=========================================")
    try:
        result = await client.use(filepath='C:/Github/Rocket/rocketride/ap_sentinel.pipe', source='chat_1')
        token = result['token']
        
        question = Question(expectJson=True)
        question.addQuestion(question_text)
        
        async def on_sse(event_type, data):
            pass # Suppress thinking output to focus on JSON
            
        response = await client.chat(token=token, question=question, on_sse=on_sse)
        raw_answer = response.get('answers', [{}])[0]
        
        print("\n--- RAW PIPELINE RESPONSE ---")
        if isinstance(raw_answer, dict):
            print(json.dumps(raw_answer, indent=2))
        else:
            print(raw_answer)
        print("-------------------------------")
        
        # Verify JSON
        try:
            if isinstance(raw_answer, dict):
                parsed = raw_answer
            else:
                cleaned = raw_answer
                if '```json' in cleaned:
                    cleaned = re.search(r'```json\s*(.*?)\s*```', cleaned, re.DOTALL).group(1)
                elif '```' in cleaned:
                    cleaned = re.search(r'```\s*(.*?)\s*```', cleaned, re.DOTALL).group(1)
                parsed = json.loads(cleaned)
                
            print("\n✅ JSON VALIDATION: PASS")
            print("Parsed JSON:")
            print(json.dumps(parsed, indent=2))
        except Exception as e:
            print(f"\n❌ JSON VALIDATION: FAIL ({e})")
            
        await client.terminate(token=token)
    except Exception as e:
        print(f"ERROR running {name}: {e}")

async def run_all():
    client = RocketRideClient()
    try:
        await client.connect()
        
        # await run_case(client, "clear", "Analyze this test payment: vendor Acme Supplies, amount INR 185000, bank account XXXX4821, IFSC ABCD0001234. History matches trusted vendor. Return a concise screening result.")
        
        await run_case(client, "fraud", "Analyze this test payment: vendor Acme Supplies, amount INR 585000, bank account YYYY9999 (URGENT PAYMENT CHANGED ACCOUNT), IFSC ABCD0009999. Do not verify.")
        
        # await run_case(client, "disagreement", "Analyze this test payment: vendor Acme Supplies, amount INR 185000, bank account XXXX4821, IFSC ABCD0001234. History matches trusted vendor, but the email tone is highly urgent and unusual.")
        
    finally:
        if client.is_connected():
            await client.disconnect()

if __name__ == "__main__":
    if uri_present == "YES" and apikey_present == "YES":
        asyncio.run(run_all())
    else:
        print("SDK execution aborted: Missing configuration.")

