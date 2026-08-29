import urllib.request
import socket

def scan_rocketride():
    # known active local ports from netstat
    ports = [5001, 7768, 8883, 8884, 11434, 51574, 55838, 55886, 56953, 56954, 58799, 58800, 58804, 58805, 59275]
    for port in ports:
        try:
            req = urllib.request.Request(f'http://127.0.0.1:{port}')
            with urllib.request.urlopen(req, timeout=1) as response:
                body = response.read().decode('utf-8')
                if 'rocketride' in body.lower() or 'rocketride' in str(response.headers).lower():
                    print(f"Found RocketRide on port {port}")
                    return
        except Exception as e:
            pass
    print("RocketRide not found on active ports.")

scan_rocketride()
