import os
import asyncio
from dotenv import load_dotenv
from rocketride import RocketRideClient

load_dotenv('../.env')

apikey = os.environ.get("ROCKETRIDE_APIKEY")

async def test_auth():
    # Intentionally not passing uri to see if it auto-discovers
    client = RocketRideClient()
    try:
        await client.connect(apikey)
        print("Auth success! Connected to active RocketRide Local runtime.")
    except Exception as e:
        print("Auth failed:", str(e))
    finally:
        await client.disconnect()

asyncio.run(test_auth())
