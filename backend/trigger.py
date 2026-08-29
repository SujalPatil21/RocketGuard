import requests

try:
    print('Logging in...')
    token = requests.post('http://localhost:5001/auth/login', json={'email':'demo@apsentinel.com', 'password':'Demo@Sentinel1!'}).json()['data']['access_token']
    
    print('Resetting demo...')
    requests.post('http://localhost:5001/api/reset-demo', headers={'Authorization': 'Bearer '+token})
    
    print('Running screen-batch...')
    res = requests.post('http://localhost:5001/api/screen-batch', headers={'Authorization': 'Bearer '+token})
    print(res.status_code, res.text)
except Exception as e:
    print(e)
