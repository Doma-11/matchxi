import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,access} from 'node:fs/promises';
import sharp from 'sharp';
await mkdir('qa-temp',{recursive:true});
await build({stdin:{contents:"export * from './netlify/lib/stadium-art-service';export * from './netlify/lib/stadium-outline';export * from './app/stadium-art';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'qa-temp/stadium-art-under-test.mjs'});
const {homeStadiumArt,createStadiumArtService,safeStadiumUrl,isClubHome,stadiumOutline}=await import('../qa-temp/stadium-art-under-test.mjs');
const game=(home='Arsenal',venue='Emirates Stadium',league='eng.1')=>({game:{home:{name:home},away:{name:'Liverpool'},venue,league}});
const request=(suffix='')=>new Request('https://matchxi.netlify.app/api/stadium-art?club=club%3Aarsenal&venue=Emirates+Stadium'+suffix);
function store(){const data=new Map(),metadata=new Map();return {data,async get(k){return data.get(k)||null},async getWithMetadata(k){return data.has(k)?{data:data.get(k),metadata:metadata.get(k)||{}}:null},async set(k,v,opts={}){if(opts.onlyIfNew&&data.has(k))return {modified:false};data.set(k,v);metadata.set(k,opts.metadata||{});return {modified:true}},async setJSON(k,v){data.set(k,v)}}}
const summary={title:'Emirates Stadium',description:'Football stadium in London, England',extract:'The Emirates Stadium is a football stadium in London. It has been the home of Arsenal since 2006.',originalimage:{source:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Emirates.jpg'}};
const photoInfo={query:{pages:{1:{imageinfo:[{thumburl:'https://upload.wikimedia.org/wikipedia/commons/a/ab/Emirates.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Emirates.jpg',extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'},Artist:{value:'<b>Photographer</b>'}}}]}}}};
function source(){const calls=[];return {calls,async fetch(url){calls.push(String(url));if(String(url).includes('/page/summary/'))return Response.json(summary);if(String(url).includes('/w/api.php'))return Response.json(photoInfo);return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/jpeg'}})}}}

test('home identity selects one reusable seed asset, across matches and provider aliases',async()=>{
 const real=homeStadiumArt(game('Real Madrid','Santiago Bernabéu','esp.1')),liverpool=homeStadiumArt(game('Liverpool','Anfield'));
 assert.match(real.src,/bernabeu-outline-v1.webp$/);assert.match(liverpool.src,/anfield-outline-v1.webp$/);
 assert.deepEqual(homeStadiumArt(game('Real Madrid','Different spelling','esp.1')),real);
 assert.deepEqual(homeStadiumArt(game('Liverpool FC','Anfield')),liverpool);
 for(const art of [real,liverpool]){await access('public'+art.src);assert.ok((await readFile('public'+art.src)).length<45000)}
});
test('stadium requests are lazy declarations; unknown identities and the three club cups make no requests',()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Resolver must never fetch')};
 try{assert.match(homeStadiumArt(game()).src,/^\/stadiums\/arsenal-outline-v1.webp$/);assert.deepEqual(homeStadiumArt(game('Arsenal',null)),homeStadiumArt(game()));assert.equal(homeStadiumArt(game('Unregistered club')),null);for(const league of ['uefa.champions','uefa.europa','uefa.europa.conf','uefa.nations'])assert.equal(homeStadiumArt(game('Liverpool','Anfield',league)),null)}finally{globalThis.fetch=original}
});
test('only a stadium described as the home of the club qualifies; an away visit is insufficient',()=>{
 const club={name:'Arsenal',aliases:['ARS','Arsenal FC']};assert.equal(isClubHome(summary,club),true);assert.equal(isClubHome({...summary,extract:'Liverpool played Arsenal here in a friendly.'},club),false);assert.equal(isClubHome({...summary,description:'Football club',extract:'Arsenal play home games at a stadium.'},club),false);
});
test('the first visible request builds once; simultaneous and future requests reuse stored image and credit',async()=>{
 const s=store(),remote=source();let renders=0;const image=new Uint8Array([82,73,70,70]);
 const handle=createStadiumArtService({seeds:{},store:s,fetcher:remote.fetch,render:async()=>{renders++;return image}});
 const replies=await Promise.all([handle(request()),handle(request())]);for(const r of replies){assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/webp');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),image)}
 assert.equal(remote.calls.length,3);assert.equal(renders,1);
 // A different spelling/fixture must hit the club cache before any source lookup.
 const again=await handle(new Request('https://matchxi.netlify.app/api/stadium-art?club=club%3Aarsenal&venue=Emirates'));assert.equal(again.status,200);assert.equal(remote.calls.length,3);
 const credit=await handle(request('&credits=1'));assert.equal(credit.status,200);assert.match(await credit.text(),/Photographer/);assert.equal(remote.calls.length,3);
});
test('unverified or unavailable sources are negatively cached instead of repeatedly downloading',async()=>{
 const s=store();let calls=0,rendered=0;const handle=createStadiumArtService({seeds:{},store:s,fetcher:async()=>{calls++;return Response.json({...summary,extract:'Not the home of this team.'})},render:async()=>{rendered++;return new Uint8Array()}});
 assert.equal((await handle(request())).status,404);assert.equal((await handle(request())).status,404);assert.equal(calls,1);assert.equal(rendered,0);
});
test('untrusted image URLs, oversized source bodies and licences without reuse rights are rejected',async()=>{
 for(const url of ['http://upload.wikimedia.org/a.jpg','https://example.com/a.jpg','https://user@upload.wikimedia.org/a.jpg','https://upload.wikimedia.org:4430/a.jpg'])assert.throws(()=>safeStadiumUrl(url));
 const remote=source();const bad=structuredClone(photoInfo);bad.query.pages[1].imageinfo[0].extmetadata.LicenseShortName.value='All rights reserved';
 const handle=createStadiumArtService({seeds:{},store:store(),fetcher:async(url,opts)=>String(url).includes('/w/api.php')?Response.json(bad):remote.fetch(url,opts)});assert.equal((await handle(request())).status,404);
 const huge=createStadiumArtService({seeds:{},store:store(),fetcher:async()=>new Response('x',{headers:{'Content-Length':'9000000'}})});assert.equal((await huge(request())).status,404);
});
test('malformed clubs and non-GET methods do not fetch, and shipped seeds redirect directly to static assets',async()=>{
 const handle=createStadiumArtService({store:store(),fetcher:async()=>{throw Error('Unexpected request')}});
 assert.equal((await handle(new Request('https://matchxi.netlify.app/api/stadium-art?club=evil'))).status,400);
 assert.equal((await handle(new Request(request(),{method:'POST'}))).status,405);
 const real=await handle(new Request('https://matchxi.netlify.app/api/stadium-art?club=club%3Areal-madrid'));assert.equal(real.status,307);assert.match(real.headers.get('location'),/bernabeu/);
});
test('photo edges produce bounded transparent WebP artwork with real geometric detail',async()=>{
 const photo=await sharp({create:{width:256,height:160,channels:3,background:'#fff'}}).composite([{input:Buffer.from('<svg width="256" height="160"><path d="M20 130V70L128 30L236 70V130Z" fill="none" stroke="black" stroke-width="5"/></svg>')}]).png().toBuffer();
 const output=await stadiumOutline(photo),meta=await sharp(output).metadata();assert.equal(meta.format,'webp');assert.equal(meta.hasAlpha,true);assert.ok(meta.width<=512&&meta.height<=340);assert.ok(output.length<200000);
 const {data,info}=await sharp(output).raw().toBuffer({resolveWithObject:true});let edges=0,clear=0;for(let i=3;i<data.length;i+=info.channels){if(data[i]>100)edges++;if(data[i]===0)clear++}assert.ok(edges>100);assert.ok(clear>edges);
});

test('a stadium-page logo falls back to licensed photos of the verified stadium',async()=>{
 const calls=[];const photo=structuredClone(photoInfo);photo.query.pages[1].title='File:Emirates Stadium photograph.jpg';
 const handle=createStadiumArtService({seeds:{},store:store(),render:async()=>new Uint8Array([82,73,70,70]),fetcher:async url=>{
  calls.push(String(url));
  if(String(url).includes('/page/summary/'))return Response.json({...summary,originalimage:{source:'https://upload.wikimedia.org/wikipedia/en/f/f0/Emirates_Stadium_logo.svg'}});
  if(String(url).includes('/w/api.php')){assert.match(String(url),/generator=search/);assert.match(decodeURIComponent(String(url)),/intitle:"Emirates\+Stadium"/);return Response.json(photo)}
  return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/jpeg'}});
 }});
 assert.equal((await handle(request())).status,200);assert.equal(calls.length,3);
});
test('source redirects remain within the approved public Wikimedia hosts',async()=>{
 const handle=createStadiumArtService({seeds:{},store:store(),fetcher:async()=>new Response(null,{status:302,headers:{Location:'http://169.254.169.254/private'}})});
 assert.equal((await handle(request())).status,404);
});

test('competing cold instances keep the winning image and its attribution together',async()=>{
 const s=store(),remote=source();
 const a=createStadiumArtService({seeds:{},store:s,fetcher:remote.fetch,render:async()=>new Uint8Array([1])});
 const b=createStadiumArtService({seeds:{},store:s,fetcher:remote.fetch,render:async()=>new Uint8Array([2])});
 const [x,y]=await Promise.all([a(request()),b(request())]);assert.equal(x.status,200);assert.equal(y.status,200);assert.deepEqual(new Uint8Array(await x.arrayBuffer()),new Uint8Array(await y.arrayBuffer()));
 const credit=await a(request('&credits=1'));assert.match(await credit.text(),/Photographer/);
});

 test('every registered club has a local compact stadium, even without fixture venue metadata',async()=>{
 const identities=JSON.parse(await readFile('app/team-identities.json','utf8')),catalog=JSON.parse(await readFile('app/stadium-art-seeds.json','utf8'));
 const clubs=identities.filter(t=>t.kind==='club');assert.equal(clubs.length,163);assert.deepEqual(Object.keys(catalog).sort(),clubs.map(t=>t.id).sort());
 for(const club of clubs){const record=catalog[club.id],ticket=game(club.name,null,'eng.1');const art=homeStadiumArt(ticket);assert.ok(art,club.name);assert.equal(art.src,record.asset,club.name);assert.ok(record.artist&&record.license&&record.source&&record.credits);const bytes=await readFile('public'+record.asset),meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.ok(meta.hasAlpha);assert.ok(bytes.length<60000,club.name+' image must stay compact');}
 assert.equal(catalog['club:ac-milan'].asset,catalog['club:internazionale'].asset);assert.equal(catalog['club:rudes'].asset,catalog['club:gorica'].asset);
 });

test('every national team has one local home ground across tournaments and changing fixture venues',async()=>{
 const teams=JSON.parse(await readFile('app/team-identities.json','utf8')).filter(t=>t.kind==='national'),catalog=JSON.parse(await readFile('app/national-stadium-art.json','utf8'));
 assert.equal(teams.length,86);assert.deepEqual(Object.keys(catalog).sort(),teams.map(t=>t.id).sort());
 const fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('National tickets must never fetch their ground mapping')};
 try{for(const team of teams){
  const record=catalog[team.id],ticket=game(team.name,null,'fifa.world'),art=homeStadiumArt(ticket);assert.ok(art,team.name);assert.equal(art.src,record.asset);assert.deepEqual(homeStadiumArt({...ticket,national:true,game:{...ticket.game,venue:'A different neutral stadium',league:'fifa.friendly'}}),art);
  assert.ok(record.artist&&record.licenseUrl&&record.source&&record.credits);const bytes=await readFile('public'+art.src),meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.hasAlpha,true);assert.ok(bytes.length<60000,team.name+' image budget');
 }assert.equal(homeStadiumArt(game('Unregistered country',null,'fifa.world')),null);assert.equal(catalog['national:croatia'].asset,JSON.parse(await readFile('app/stadium-art-seeds.json','utf8'))['club:dinamo'].asset)}finally{globalThis.fetch=fetch}
});

test('physical paper skin has real alpha cutouts and stays within one shared image budget',async()=>{
 const bytes=await readFile('public/themes/matchday-ticket-skin-v2.webp'),meta=await sharp(bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.hasAlpha,true);assert.ok(bytes.length<200000);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});const alpha=(x,y)=>data[(y*info.width+x)*4+3];assert.equal(alpha(0,0),0);assert.ok(alpha(Math.floor(info.width/2),Math.floor(info.height/2))>245);
 let clear=0,paper=0;for(let i=3;i<data.length;i+=4){if(data[i]<20)clear++;if(data[i]>245)paper++}assert.ok(clear>500,'torn edges remain transparent');assert.ok(paper>info.width*info.height*.8,'ticket remains readable paper');
});
