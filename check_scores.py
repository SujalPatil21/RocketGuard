import sqlite3
conn = sqlite3.connect('backend/auth.db')
c = conn.cursor()
c.execute("SELECT count(*) FROM payments WHERE id NOT LIKE 'PAY-IN-%' AND status = 'PENDING' AND risk_score > 0")
print('Processed but PENDING (score 1-50):', c.fetchone()[0])

c.execute("SELECT count(*) FROM payments WHERE id NOT LIKE 'PAY-IN-%' AND status = 'PENDING' AND risk_score = 0")
print('Unprocessed PENDING (score 0):', c.fetchone()[0])
conn.close()
