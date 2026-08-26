import asyncio
from rocketride import RocketRideClient

async def test_connection():
    client = RocketRideClient(uri="http://localhost:5565")
    try:
        print("Connecting to localhost...")
        res = await client.connect()
        print("Connected:", res)
    except Exception as e:
        print("Connection failed:", e)
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(test_connection())
