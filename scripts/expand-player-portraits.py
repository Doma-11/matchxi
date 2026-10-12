"""Collect current squad portraits without placing the full catalogue in the browser bundle."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from PIL import Image,ImageOps
from io import BytesIO
import urllib.request,re,json,html,unicodedata,hashlib,time
root=Path(__file__).resolve().parents[1];work=root/'qa-temp/expanded-portraits';work.mkdir(parents=True,exist_ok=True)
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower())
aliases={'atleti':'Atletico Madrid','bayernmunchen':'Bayern Munich','bdortmund':'Borussia Dortmund','manchestercity':'Manchester City','internazionale':'Internazionale','sportingcp':'Sporting CP','psg':'Paris Saint-Germain','crvenazvezda':'Red Star Belgrade','slaviapraha':'Slavia Prague'}
clubs=json.loads((root/'public/data/clubs.json').read_text());domestic=[dict(t,league=l) for l,ts in clubs.items() for t in ts]
def canonical(name):
 n=norm(name);n=norm(aliases.get(n,name))
 return next((t['name'] for t in domestic if norm(t['name'])==n or norm(t['name'].removeprefix('FC '))==n),aliases.get(norm(name),name))
def get(url):return urllib.request.urlopen(url,timeout=14).read()
ucl=root/'qa-temp/ucl-clubs.html'
if not ucl.exists():ucl.write_text(get('https://www.uefa.com/uefachampionsleague/clubs/').decode())
h=ucl.read_text();phase=h[h.index('League phase'):h.index('Play-offs',h.index('League phase'))]
teams=list(dict.fromkeys(re.findall(r'href="(/uefachampionsleague/clubs/\d+[^\"]*)"',phase)))
print('Targets:',len(domestic),'domestic clubs and',len(teams),'Champions League clubs',flush=True)
entries=[];failures=[];rosters=[]
def roster(team):
 url=f'https://site.api.espn.com/apis/site/v2/sports/soccer/{team["league"]}/teams/{team["id"]}/roster'
 try:
  file=work/('roster-'+str(team['id'])+'.json');p=json.loads(file.read_text()) if file.exists() else json.loads(get(url));file.write_text(json.dumps(p));assert p.get('season',{}).get('year')==2026
  return [dict(name=a['displayName'],team=team['name'],teamAliases=[],aliases=[a.get('fullName',a['displayName'])],season=2026,priority=1,url=a.get('headshot',{}).get('href') or f'https://a.espncdn.com/i/headshots/soccer/players/full/{a["id"]}.png',source=a.get('links',[{}])[0].get('href') or url,provider='ESPN',playerId=str(a['id'])) for a in p.get('athletes',[])],None
 except Exception as e:return [],dict(team=team['name'],source='ESPN roster',error=str(e)[:100])
with ThreadPoolExecutor(max_workers=6) as pool:
 for result in pool.map(roster,domestic):
  rows,error=result;entries.extend(rows)
  if error:failures.append(error)
print('Roster portraits discovered:',len(entries),'source failures:',len(failures),flush=True)
def squad(path):
 url='https://www.uefa.com'+path+'squad/'
 try:
  file=work/('squad-'+path.split('/')[3]+'.html');h=file.read_text() if file.exists() else get(url).decode();file.write_text(h);name=html.unescape(re.search(r'<title>(.*?)</title>',h,re.S)[1].split('|')[0].strip());name=canonical(name)
  rows=[]
  for player,img in re.findall(r'<pk-avatar[^>]+alt="([^"]+)"[^>]+src="([^"]+/players/[^\"]+)"',h):
   if '/2027/' in img:rows.append(dict(name=html.unescape(player),team=name,teamAliases=[],aliases=[],season=2026,priority=2,url=html.unescape(img),source=url,provider='UEFA'))
  return rows,None
 except Exception as e:return [],dict(team=path,source='UEFA squad',error=str(e)[:100])
with ThreadPoolExecutor(max_workers=4) as pool:
 for rows,error in pool.map(squad,teams):
  entries.extend(rows)
  if error:failures.append(error)
# Existing verified club and Croatia portraits take precedence.
existing=json.loads((root/'app/player-portraits.json').read_text())
for e in existing:entries.append(dict(e,priority=3,team=canonical(e['team'])))
unique={}
for e in entries:
 key=norm(e['team'])+'|'+norm(e['name'])
 if key not in unique or e['priority']>unique[key]['priority']:unique[key]=e
entries=list(unique.values());print('Unique portrait candidates:',len(entries),flush=True)
import sys
if '--catalogue-only' in sys.argv:
 result=[]
 for e in entries:
  if e.get('photo','').startswith('/portraits/'):
   result.append(dict(e,ready=True));continue
  key=hashlib.sha256((e['team']+'|'+e['name']+'|'+str(e['season'])+'|'+e['url']).encode()).hexdigest();file=work/(key+'.webp')
  result.append(dict(e,photo='/api/portrait-image?key='+key,blobKey=key,ready=file.exists(),bytes=file.stat().st_size if file.exists() else 0))
 (root/'app/player-portraits.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 report=dict(domesticTeams=len(domestic),championsLeagueTeams=len(teams),portraitCandidates=len(result),readyPortraits=sum(e['ready'] for e in result),teams={t:sum(e['team']==t for e in result) for t in sorted(set(e['team'] for e in result))},sourceFailures=failures,storage='Images are validated, compressed and saved on demand; existing player photos remain as fallbacks.')
 (root/'public/data/portrait-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('Catalogue ready:',len(result),'players,',len(report['teams']),'teams;',report['readyPortraits'],'portraits already checked',flush=True);sys.exit(0)
completed=0;success=[];missing=[]
def download(e):
 if e.get('photo','').startswith('/portraits/') and (root/'public'/e['photo'].lstrip('/')).exists():return e,None
 try:
  key=hashlib.sha256((e['team']+'|'+e['name']+'|'+str(e['season'])+'|'+e['url']).encode()).hexdigest();file=work/(key+'.webp')
  if not file.exists():
   raw=get(e['url']);im=Image.open(BytesIO(raw));assert im.width>=64 and im.height>=64
   im=ImageOps.fit(im.convert('RGBA'),(256,256),centering=(.5,.25));im.save(file,'WEBP',quality=78)
  return dict(e,photo='/api/portrait-image?key='+key,blobKey=key,bytes=file.stat().st_size),None
 except Exception as ex:return None,dict(team=e['team'],name=e['name'],source=e.get('provider','official'),error=str(ex)[:90])
with ThreadPoolExecutor(max_workers=10) as pool:
 for e,error in pool.map(download,entries):
  completed+=1
  if e:success.append(e)
  if error:missing.append(error)
  if completed%150==0:print('Portrait checks:',completed,'/',len(entries),'saved:',len(success),flush=True)
report=dict(checkedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),domesticTeams=len(domestic),championsLeagueTeams=len(teams),savedPortraits=len(success),bytes=sum(e.get('bytes',0) for e in success),teams={t:sum(e['team']==t for e in success) for t in sorted(set(e['team'] for e in success))},sourceFailures=failures,missingImages=missing)
(root/'app/player-portraits.json').write_text(json.dumps(success,ensure_ascii=False,indent=2));(root/'public/data/portrait-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('DONE',len(success),'portraits',len(report['teams']),'teams',report['bytes'],'bytes; missing:',len(missing),flush=True)
