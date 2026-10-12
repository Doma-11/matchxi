"""Build a small, verified official portrait catalogue; images are served separately from JS."""
from pathlib import Path
import re,json,html,urllib.request,concurrent.futures,unicodedata,subprocess
root=Path(__file__).resolve().parents[1]
cache=root/'qa-temp';cache.mkdir(exist_ok=True)
sources={'uefa':'https://www.uefa.com/uefanationsleague/teams/56370--croatia/squad/','barcelona':'https://www.fcbarcelona.com/en/football/first-team/players','bayern':'https://fcbayern.com/en/teams/first-team','madrid':'https://www.realmadrid.com/en-US/football/first-team/players/vinicius-jr'}
for key,url in sources.items():
 page=cache/('portraits-'+key+'.html')
 if not page.exists():page.write_text(urllib.request.urlopen(url,timeout=20).read().decode())
entries=[]
def text(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def add(name,team,url,source,aliases=None):
 entries.append(dict(name=name,team=team,url=html.unescape(url),source=source,aliases=aliases or [],season=2026))
s=(cache/'portraits-uefa.html').read_text()
for name,url in re.findall(r'<pk-avatar[^>]+alt="([^"]+)"[^>]+src="([^"]+/players/[^\"]+)"',s):add(html.unescape(name),'Croatia',url,'https://www.uefa.com/uefanationsleague/teams/56370--croatia/squad/')
s=(cache/'portraits-barcelona.html').read_text()
for link,part in re.findall(r'<a href="([^"]+/players/[^\"]+)"[^>]*class="team-person[^>]*>(.*?)</a>',s,re.S):
 first=re.search(r'class="[^"]*first-name[^\"]*">(.*?)</span>',part,re.S);last=re.search(r'class="[^"]*last-name[^\"]*">(.*?)</span>',part,re.S);img=re.search(r'data-img-src="([^"]+)"',part)
 if first and last and img:
  name=text(first[1])+' '+text(last[1]);alias=['Lamine Yamal'] if 'Lamine' in name else []
  add(name,'Barcelona',img[1]+'?width=300&height=300',link,alias)
s=(cache/'portraits-bayern.html').read_text()
for url in dict.fromkeys(re.findall(r'<img[^>]+src="([^"]+/spielerportraits/ganzkoerper/[^\"]+)"',s)):
 slug=url.split('/')[-1].split('.')[0];name=slug.replace('_',' ').replace('-',' ').title();add(name,'Bayern Munich',url,'https://fcbayern.com/en/teams/first-team')
s=(cache/'portraits-madrid.html').read_text().replace('\\u002F','/')
for name,pattern,aliases in [('Jude Bellingham','BELLINGHAM_CARITA',['J. Bellingham']),('Vinícius Júnior','VINI_CARITA',['Vinicius Junior','Vinicius Jr.','Vinícius Jr.']),('Kylian Mbappé','MBAPPE_CARITA',[])]:
 urls=re.findall(r'https[^\s"<>]+/'+pattern+r'[^\s"<>]*\.png',s)
 if urls:add(name,'Real Madrid',urls[0],'https://www.realmadrid.com/en-US/football/first-team/players/vinicius-jr',aliases)
def slug(s):return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()).strip('-')
def download(e):
 try:
  key=slug(e['team']+'-'+e['name']);raw=cache/(key+'.image');raw.write_bytes(urllib.request.urlopen(e['url'],timeout=15).read());out=root/'public/portraits'/(key+'.webp')
  code="import sharp from 'sharp';await sharp(process.argv[1]).resize(256,256,{fit:'cover',position:'north'}).webp({quality:78}).toFile(process.argv[2]);"
  subprocess.run(['node','--input-type=module','-e',code,str(raw),str(out)],cwd=root,check=True,capture_output=True);return {**e,'photo':'/portraits/'+out.name,'bytes':out.stat().st_size}
 except Exception as ex:print('Unavailable:',e['name'],str(ex)[:100]);return None
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:result=[e for e in pool.map(download,entries) if e]
(root/'app/player-portraits.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('Saved',len(result),'portraits;',sum(e['bytes'] for e in result),'bytes')
print({team:sum(e['team']==team for e in result) for team in set(e['team'] for e in result)})
