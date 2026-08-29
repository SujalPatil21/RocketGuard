import sqlite3
conn = sqlite3.connect('auth.db')
conn.execute("UPDATE users SET is_verified = 1 WHERE email = 'admin@example.com'")
conn.commit()
conn.close()
