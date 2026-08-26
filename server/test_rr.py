import asyncio
from rocketride import RocketRideClient

async def test_connection():
    client = RocketRideClient()
    try:
        print("Connecting...")
        # Since we don't have a real API key for local, just passing 'local' or an empty string might work based on the module defaults
        res = await client.connect("local")
        print("Connected:", res)
    except Exception as e:
        print("Connection failed:", e)
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(test_connection())
