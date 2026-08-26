import os
from urllib.parse import urlparse

env_path = 'C:/Github/Rocket/.env'

uri = None
apikey = None
keys = []

try:
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip()
                keys.append(k)
                if k == 'ROCKETRIDE_URI':
                    uri = v
                elif k == 'ROCKETRIDE_APIKEY':
                    apikey = v
except Exception as e:
    print(f"Error reading .env: {e}")

print("Keys found in .env:", keys)

if uri:
    parsed = urlparse(uri)
    print(f"ROCKETRIDE_URI host: {parsed.hostname}")
    print(f"ROCKETRIDE_URI port: {parsed.port}")
else:
    print("ROCKETRIDE_URI is not set in .env")

if apikey:
    is_default = (apikey == "MYAPIKEY")
    print(f"Is local development API key the default 'MYAPIKEY'? {is_default}")
else:
    print("ROCKETRIDE_APIKEY is not set in .env")
