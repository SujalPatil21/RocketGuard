import asyncio
import os
from dotenv import load_dotenv
from rocketride import RocketRideClient

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)

async def test_conn():
    uri = os.environ.get("ROCKETRIDE_URI")
    apikey = os.environ.get("ROCKETRIDE_APIKEY")
    print(f"Testing connection to URI: {uri}")
    
    client = RocketRideClient(uri=uri)
    try:
        await client.connect(apikey)
        print("SDK connection: PASS")
    except Exception as e:
        print(f"SDK connection: FAIL ({e})")
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(test_conn())
