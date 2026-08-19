import urllib.request
import urllib.error

try:
    req = urllib.request.Request(
        'http://localhost:8000/location/stop',
        data=b'{"device_id":"test","session_id":"test"}',
        headers={'Content-Type': 'application/json'}
    )
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
