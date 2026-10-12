#!/usr/bin/env python3
"""Authenticated automation HTTP. Never include credentials in output or URLs."""
import argparse,json,os,pathlib,urllib.request,urllib.error,gzip
BASE='https://touchline-football-hub.netlify.app'
def request(path):
    if not path.startswith('/api/') or path.startswith('//'):
        raise ValueError('Only Touchline API paths are allowed')
    secret=os.environ.get('TOUCHLINE_REFRESH_SECRET')
    if not secret:
        secret_file=pathlib.Path(os.environ.get('TOUCHLINE_SERVICE_SECRET_FILE','/workspace/scratch/5e453b0702af/netlify-refresh-secret'))
        secret=secret_file.read_text().strip()
    req=urllib.request.Request(BASE+path,headers={'x-touchline-refresh':secret,'Accept':'application/json','Cache-Control':'no-cache'})
    with urllib.request.urlopen(req,timeout=90) as response:
        raw=response.read()
        if response.headers.get('Content-Encoding')=='gzip':raw=gzip.decompress(raw)
        return json.loads(raw)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('path');args=parser.parse_args()
    try:print(json.dumps(request(args.path),ensure_ascii=False))
    except FileNotFoundError:raise SystemExit('Service credential unavailable. Restore authorized server access; do not attempt a public bypass.')
    except urllib.error.HTTPError as error:raise SystemExit('Touchline request failed: HTTP '+str(error.code))
