import asyncio, os, rocketride, json
async def run():
    client = rocketride.RocketRideClient()
    await client.connect(os.environ.get('ROCKETRIDE_APIKEY'))
    services = await client.get_services()
    with open('services.json', 'w', encoding='utf-8') as f:
        json.dump(services, f, indent=2)
    await client.disconnect()
asyncio.run(run())
