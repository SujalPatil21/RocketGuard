import sqlite3, requests
conn=sqlite3.connect('auth.db')
conn.execute("UPDATE users SET is_verified = 1 WHERE email = 'demo@apsentinel.com'")
conn.commit()
conn.close()
res = requests.post('http://localhost:5001/auth/login', json={'email':'demo@apsentinel.com', 'password':'Demo@Sentinel1!'})
token = res.json()['data']['access_token']
res2 = requests.post('http://localhost:5001/api/screen-batch', headers={'Authorization': 'Bearer '+token})
print(res2.status_code, res2.text)
