import sqlite3

conn = sqlite3.connect('backend/auth.db')
c = conn.cursor()

c.execute("SELECT reasoning FROM attack_campaigns")
campaigns = c.fetchall()
print('Campaign reasoning:')
for (r,) in campaigns:
    print(r)

c.execute("SELECT status, count(*) FROM payments WHERE id NOT LIKE 'PAY-IN-%' GROUP BY status")
statuses = c.fetchall()
print('\nPayment statuses (Expanded):', statuses)

c.execute("SELECT count(*) FROM payments WHERE id NOT LIKE 'PAY-IN-%'")
total = c.fetchone()[0]
print('Total expanded payments in DB:', total)
conn.close()
