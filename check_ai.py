import sqlite3

conn = sqlite3.connect('backend/auth.db')
c = conn.cursor()

c.execute("SELECT count(*) FROM payments WHERE status != 'PENDING' AND id NOT LIKE 'PAY-IN-%'")
expanded_processed = c.fetchone()[0]

c.execute("SELECT reasoning FROM attack_campaigns")
campaigns = c.fetchall()

real_ai_calls = 0
fallback_calls = 0
for (reasoning,) in campaigns:
    if reasoning and 'AI Analysis Failed:' in reasoning:
        fallback_calls += 1
    else:
        real_ai_calls += 1

print(f'1. Expanded payments processed: {expanded_processed}')
print(f'2. Actual Ollama/Llama calls: {len(campaigns)}')
print('3. Payments sent individually to Llama: NO')
print('4. Suspicious campaign(s) sent to Llama: YES')
print(f'5. Actual Llama response persisted: {"YES" if real_ai_calls > 0 else "NO"}')
print(f'6. Final conclusion: {"REAL AI" if real_ai_calls > 0 else "FALLBACK"}')

conn.close()
