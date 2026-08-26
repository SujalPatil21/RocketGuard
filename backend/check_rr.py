import os
import asyncio
from dotenv import load_dotenv
from rocketride import RocketRideClient

load_dotenv('../.env')

uri = os.environ.get("ROCKETRIDE_URI")
apikey = os.environ.get("ROCKETRIDE_APIKEY")

print("ROCKETRIDE_URI_PRESENT:", bool(uri))
print("ROCKETRIDE_APIKEY_PRESENT:", bool(apikey))
if uri:
    from urllib.parse import urlparse
    parsed = urlparse(uri)
    print("URI_HOST:", parsed.hostname)
    print("URI_PORT:", parsed.port)

async def test_auth():
    client = RocketRideClient(uri=uri) if uri else RocketRideClient()
    try:
        await client.connect(apikey)
        print("Auth success!")
    except Exception as e:
        print("Auth failed:", str(e))
    finally:
        await client.disconnect()

asyncio.run(test_auth())
