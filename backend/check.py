import sqlite3
import json
conn = sqlite3.connect('C:/Github/Rocket/backend/auth.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", tables)

for t in tables:
    if 'campaign' in t[0].lower():
        print(f"Schema for {t[0]}:")
        cursor.execute(f"PRAGMA table_info({t[0]})")
        print(cursor.fetchall())
        cursor.execute(f"SELECT * FROM {t[0]} ORDER BY id DESC LIMIT 1")
        print(cursor.fetchall())
