import asyncio
import json
from rocketride import RocketRideClient
from rocketride.schema import Question

async def run_pipeline():
    # 1. Initialize client using the SDK's auto-config mechanism 
    # (it automatically loads ROCKETRIDE_URI and ROCKETRIDE_APIKEY from .env)
    client = RocketRideClient()
    
    try:
        # 2. Connect to the local RocketRide DAP server
        print("Connecting to RocketRide DAP server...")
        await client.connect()
        
        # 3. Load/use pipeline (starts the pipeline and returns the task token)
        # We explicitly set source='chat_1' since it's the chat source
        print("Starting pipeline execution...")
        result = await client.use(
            filepath='C:/Github/Rocket/rocketride/ap_sentinel.pipe', 
            source='chat_1'
        )
        token = result['token']
        print(f"Pipeline started successfully. Task token: {token}")
        
        # 4. Prepare Chat input
        question = Question()
        question.addQuestion("Analyze this test payment: vendor Acme Supplies, amount INR 185000, bank account XXXX4821, IFSC ABCD0001234. History matches trusted vendor. Return a concise screening result.")
        
        # 5. Send message and receive output (with streaming to see progress)
        print("\nSending question to Chat source...")
        
        async def on_sse(event_type, data):
            print(f"[SSE EVENT: {event_type}] {json.dumps(data)}")
            
        response = await client.chat(
            token=token,
            question=question,
            on_sse=on_sse
        )
        
        print("\n--- FINAL PIPELINE RESPONSE ---")
        print(json.dumps(response, indent=2))
        print("-------------------------------")
        
        # 6. Terminate pipeline
        print("\nTerminating pipeline...")
        await client.terminate(token=token)
        print("Terminated.")
        
    except Exception as e:
        print(f"\nERROR: {e}")
    finally:
        # 7. Cleanup
        print("Disconnecting client...")
        if client.is_connected():
            await client.disconnect()

if __name__ == "__main__":
    asyncio.run(run_pipeline())
