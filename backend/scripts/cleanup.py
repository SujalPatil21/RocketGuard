import sqlite3

def cleanup():
    conn = sqlite3.connect('backend/auth.db')
    c = conn.cursor()
    c.execute("DELETE FROM attack_campaigns WHERE id = '17a737e5-e79b-473d-897f-7f7a516535e9'")
    c.execute("DELETE FROM campaign_payments WHERE payment_id LIKE 'PAY-TEST-%'")
    c.execute("DELETE FROM risk_signals WHERE payment_id LIKE 'PAY-TEST-%'")
    c.execute("DELETE FROM payments WHERE id LIKE 'PAY-TEST-%'")
    conn.commit()

    c.execute("SELECT count(1) FROM payments")
    print("Payments left:", c.fetchone()[0])
    
    conn.close()

if __name__ == "__main__":
    cleanup()
