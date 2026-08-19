import urllib.request
import urllib.error
import json

try:
    req = urllib.request.Request(
        'http://localhost:8000/location/stop',
        data=json.dumps({'device_id':'star-10','session_id':'test'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print("BODY:", e.read().decode('utf-8'))
