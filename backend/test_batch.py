import asyncio
import httpx
import time

BASE_URL = "http://localhost:8000"

async def test_batch():
    async with httpx.AsyncClient() as client:
        # Get token
        res = await client.post(f"{BASE_URL}/auth/login", json={"email": "demo@apsentinel.com", "password": "Demo@Sentinel1!"})
        token = res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Start batch screening in background
        print("Resetting demo state...")
        await client.post(f"{BASE_URL}/api/reset-demo", headers=headers)
        
        print("Starting batch screening...")
        batch_task = asyncio.create_task(client.post(f"{BASE_URL}/api/screen-batch", headers=headers, timeout=600))
        
        # Test simultaneous request gets 409
        await asyncio.sleep(1)
        print("Sending simultaneous request...")
        res2 = await client.post(f"{BASE_URL}/api/screen-batch", headers=headers)
        print(f"Simultaneous request status: {res2.status_code}")
        
        # Poll for progress
        print("Polling progress...")
        last_pending = -1
        while not batch_task.done():
            res = await client.get(f"{BASE_URL}/api/payments", headers=headers)
            payments = res.json()
            pending = sum(1 for p in payments if p["status"] == "PENDING")
            if pending != last_pending:
                print(f"Remaining PENDING: {pending}/{len(payments)}")
                last_pending = pending
            await asyncio.sleep(1)
        
        res = await batch_task
        print(f"Batch task finished with status: {res.status_code}")
        
        # Fetch final results
        res_final = await client.get(f"{BASE_URL}/api/payments", headers=headers)
        final_payments = res_final.json()
        for p in final_payments:
            print(f"{p['payment']['invoice_id']} -> {p['status']}")
            for evt in p.get('audit_events', []):
                print(f"  - {evt['type']}: {evt['message']}")
        final_pending = sum(1 for p in final_payments if p["status"] == "PENDING")
        print(f"Final PENDING: {final_pending}")

if __name__ == "__main__":
    asyncio.run(test_batch())
