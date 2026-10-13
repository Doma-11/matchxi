import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/match-streams.ts'],bundle:true,platform:'node',format:'esm',write:false});const {listedMatchStreams}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
test('only matching teams receive deduplicated source-page links',()=>{const html='<tr><td>12:30</td><td>Arsenal vs Leeds United</td><td><a href="/hd-1">Watch</a><a href="/hd-1">Watch</a></td></tr><tr><td>15:00</td><td>Chelsea vs Everton</td><td><a href="/hd-2">Watch</a></td></tr>';const links=listedMatchStreams(html,'Arsenal','Leeds United');assert.equal(links.length,1);assert.equal(links[0].url,'https://www.soccerstreams.zone/hd-1');assert.deepEqual(listedMatchStreams(html,'Arsenal','Everton'),[]);});
test('external hosts and executable links are rejected',()=>{const html='<tr><td>12:30</td><td>Arsenal vs Leeds United</td><td><a href="https://evil.example/">Watch</a><a href="javascript:alert(1)">Watch</a></td></tr>';assert.deepEqual(listedMatchStreams(html,'Arsenal','Leeds United'),[]);});

test('published Champions League aliases match both fixture teams exactly',()=>{
 const row=(home,away,url)=>`<tr><td>21:00</td><td>${home} vs ${away}</td><td><a href="/watch/${url}.htm">Watch</a></td></tr>`;
 const html=row('Sabah','Slavia Praha','hd-1')+row('Viking','Bayern München','hd-2')+row('RB Leipzig','PSV','hd-3');
 for(const [home,away,url] of [['Sabah FK','Slavia Prague','hd-1'],['Viking FK','Bayern Munich','hd-2'],['RB Leipzig','PSV Eindhoven','hd-3']]){
  assert.deepEqual(listedMatchStreams(html,home,away),[{url:`https://www.soccerstreams.zone/watch/${url}.htm`,label:'Stream listing 1'}]);
 }
 assert.deepEqual(listedMatchStreams(html,'Sabah FK','Bayern Munich'),[]);
 assert.deepEqual(listedMatchStreams(html,'Vikingur Reykjavik','Bayern Munich'),[]);
 assert.deepEqual(listedMatchStreams(html,'RB Leipzig','Jong PSV'),[]);
});

test('Deportivo Alavés listing matches the app fixture without confusing other Atlético clubs',()=>{const html='<tr><td>15:15</td><td>Deportivo Alavés vs Atlético Madrid</td><td><a href="/hd-6">Watch</a><a href="/eleven3">Watch</a></td></tr><tr><td>02:15</td><td>Atlético Nacional vs Deportivo Pasto</td><td><a href="/hd-10">Watch</a></td></tr>';const links=listedMatchStreams(html,'Alavés','Atletico Madrid');assert.equal(links.length,2);assert.equal(links[0].url,'https://www.soccerstreams.zone/hd-6');assert.deepEqual(listedMatchStreams(html,'Alavés','Atlético Nacional'),[])});
