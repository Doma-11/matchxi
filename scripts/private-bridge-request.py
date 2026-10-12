#!/usr/bin/env python3
"""Fresh owner-private Sites authorization on hidden stdin, never in a file or URL."""
import gzip,json,sys,termios,urllib.request,urllib.error
settings=termios.tcgetattr(sys.stdin);hidden=settings[:];hidden[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSANOW,hidden)
print('Ready for private service authorization on stdin (hidden).',flush=True)
try:config=json.loads(sys.stdin.readline())
finally:termios.tcsetattr(sys.stdin,termios.TCSANOW,settings)
base=config['url'].rstrip('/');token=config['token'];path=config['path']
if not base.startswith('https://') or not path.startswith('/api/'):raise SystemExit('Invalid target')
request=urllib.request.Request(base+'/api/touchline-netlify',data=json.dumps({'path':path}).encode(),headers={'Content-Type':'application/json','OAI-Sites-Authorization':'Bearer '+token})
try:
 with urllib.request.urlopen(request,timeout=100) as response:
  raw=response.read()
  if response.headers.get('Content-Encoding')=='gzip':raw=gzip.decompress(raw)
  print(json.dumps(json.loads(raw),ensure_ascii=False))
except urllib.error.HTTPError as error:raise SystemExit('Private data request failed: HTTP '+str(error.code))
