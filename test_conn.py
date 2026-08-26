import asyncio
from rocketride import RocketRideClient
async def t():
    c = RocketRideClient('http://127.0.0.1:55190')
    print(await c.connect('MYAPIKEY'))
    await c.disconnect()
asyncio.run(t())
