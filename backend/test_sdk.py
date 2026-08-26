import asyncio
import os
from dotenv import load_dotenv
from rocketride import RocketRideClient

load_dotenv('../.env')

async def test():
    uri = os.environ.get('ROCKETRIDE_URI')
    apikey = os.environ.get('ROCKETRIDE_APIKEY')
    print(f"URI: {uri}")
    client = RocketRideClient(uri=uri)
    try:
        await client.connect(apikey)
        print("PASS")
    except Exception as e:
        print(f"FAIL: {e}")
    finally:
        await client.disconnect()

asyncio.run(test())
