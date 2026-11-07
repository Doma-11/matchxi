#!/usr/bin/env python3
"""Manual MatchXI-only authenticated API requests; never contact Touchline."""
import argparse,json,os,urllib.request,urllib.error,gzip
from urllib.parse import urlsplit

def request(path):
    if not path.startswith('/api/') or path.startswith('//'):
        raise ValueError('Only MatchXI API paths are allowed')
    base=os.environ.get('MATCHXI_SITE_URL','').rstrip('/')
    secret=os.environ.get('MATCHXI_REFRESH_SECRET','')
    if not base or not secret:
        raise RuntimeError('Set MATCHXI_SITE_URL and MATCHXI_REFRESH_SECRET for the independent MatchXI site')
    url=urlsplit(base)
    if url.scheme!='https' or not url.hostname or url.username or url.password or url.path or url.query or url.fragment or url.hostname=='touchline-football-hub.netlify.app':
        raise ValueError('Invalid or original Touchline site URL')
    req=urllib.request.Request(base+path,headers={'x-matchxi-refresh':secret,'Accept':'application/json','Cache-Control':'no-cache'})
    with urllib.request.urlopen(req,timeout=90) as response:
        raw=response.read()
        if response.headers.get('Content-Encoding')=='gzip':raw=gzip.decompress(raw)
        return json.loads(raw)
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('path')
    args=parser.parse_args()
    try:print(json.dumps(request(args.path),ensure_ascii=False))
    except (RuntimeError,ValueError) as error:raise SystemExit(str(error))
    except urllib.error.HTTPError as error:raise SystemExit('MatchXI request failed: HTTP '+str(error.code))
