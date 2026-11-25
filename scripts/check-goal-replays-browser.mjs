// Local-only browser regression. All provider responses are mocked: this does
// NOT establish real provider playback or physical-phone compatibility.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{
 if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw Error('Install Playwright in your test environment to run this optional browser check.');
 ({chromium}=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/package.json')('playwright'));
}
await mkdir('qa-temp/goal-replays-browser',{recursive:true});
await build({entryPoints:['scripts/fixtures/goal-replays-browser.tsx'],bundle:true,outfile:'qa-temp/goal-replays-browser/app.js',jsx:'automatic',format:'esm',external:['/themes/*'],logLevel:'silent'});
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>';
const server=createServer(async(req,res)=>{try{if(['/app.js','/app.css'].includes(req.url)){res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile('qa-temp/goal-replays-browser'+req.url));}else if(req.url.startsWith('/themes/')){res.setHeader('Content-Type','image/webp');res.end(await readFile('public'+req.url));}else if(req.url.startsWith('/api/match-streams')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({streams:[{url:'https://www.soccerstreams.zone/watch/test.htm'}]}));}else if(req.url.startsWith('/api/replay-source')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({mediaUrl:'https://c-cdn.streamin.top/uploads/cfb904d3.mp4?observed'}));}else if(req.url.startsWith('/api/match-replays')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({replays:[{id:'live-test',minute:'60′',scorer:'Test scorer',team:'Home',match:'Home vs Away',score:'1–0',postUrl:'',videoUrl:'https://streamin.me/v/cfb904d3',sources:[{url:'https://streamin.me/v/cfb904d3',provider:'Streamin'}],testOnly:false}]}));}else if(req.url.startsWith('/api/stream-player')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({embedAllowed:true,embedUrl:'https://dlive.sx/stream/test.php'}));}else{res.setHeader('Content-Type','text/html');res.end(html);}}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [label,width,height,league] of [['desktop',1100,850,'uefa.champions'],['phone',390,844,'uefa.europa'],['small-phone',320,700,'uefa.champions'],['landscape',844,390,'uefa.champions']]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let liveLoads=0,playerLoads=0;
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  await page.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin))return route.continue();if(url==='https://dlive.sx/stream/test.php'){liveLoads++;return route.fulfill({contentType:'text/html',body:'<html><body>Mock live stream</body></html>'});}if(url.startsWith('https://streamable.com/e/5rneah?')){playerLoads++;return route.fulfill({contentType:'text/html',body:'<html><body>Mock provider video player</body></html>'});}return route.abort();});
  await page.goto(origin+'/?league='+league);
  assert.equal(await page.getByRole('switch',{name:'Enable Goal Replays preview'}).getAttribute('aria-checked'),'false');
  await page.getByRole('switch',{name:'Enable Goal Replays preview'}).click();
  await page.getByRole('button',{name:'Play stream 1 in app'}).click();
  const live=page.locator('.stream-viewport > iframe');await live.waitFor();
  await live.evaluate(node=>{window.__liveNode=node;});
  const large=await live.boundingBox();assert.ok(large.width>250);
  assert.equal(requests.filter(url=>url.includes('/api/match-replays')).length,0);
  await page.getByRole('button',{name:'Find Replays',exact:true}).click();
  assert.equal(playerLoads,0);assert.equal(requests.filter(url=>url.includes('/api/replay-source')).length,0);
  await page.getByRole('button',{name:'Replay Test scorer, 60′, Streamin',exact:true}).click();
  await page.getByRole('button',{name:'Play goal replay',exact:true}).waitFor();
  assert.equal(await page.locator('.goal-replay-embed video').getAttribute('src'),'https://c-cdn.streamin.top/uploads/cfb904d3.mp4?observed');
  assert.equal(requests.filter(url=>url.includes('/api/replay-source')).length,1);assert.equal(liveLoads,1);assert.ok(await live.evaluate(node=>node===window.__liveNode));
  await page.getByRole('button',{name:'Close replay and return to live match'}).click();
  assert.equal(await page.locator('.goal-replay-embed video').count(),0);
  assert.equal(await page.locator('.goal-replay-stage').count(),0);assert.equal(liveLoads,1);assert.ok(await live.evaluate(node=>node===window.__liveNode));
  assert.equal(await page.locator('.stream-popup').evaluate(node=>node.style.getPropertyValue('--accent')),league==='uefa.europa'?'#ff8a32':'#62c7ff');
  await page.getByText('Paste a video link',{exact:true}).click();
  await page.getByLabel('Video link',{exact:true}).fill('https://streamable.com/5rneah');
  await page.getByRole('button',{name:'Play in app',exact:true}).click();
  await page.getByText('Player loaded. Press Play in the video.').waitFor();
  assert.equal(liveLoads,1);assert.ok(await live.evaluate(node=>node===window.__liveNode));assert.ok((await live.boundingBox()).width<large.width*.4);
  await page.getByRole('button',{name:'Close replay and return to live match'}).click();
  assert.equal(await page.locator('.goal-replay-embed iframe').count(),0);assert.equal(liveLoads,1);assert.equal((await live.boundingBox()).width,large.width);
  playerLoads=0;
  await page.getByRole('button',{name:'Close livestream'}).click();
  await page.getByRole('button',{name:'Test without a live match'}).click();
  const clock=page.locator('.stream-viewport > iframe');await clock.waitFor();await clock.evaluate(node=>{window.__clockNode=node;window.__clockWindow=node.contentWindow;});const full=await clock.boundingBox();
  await page.getByLabel('Streamable video link').fill('https://evil.test/video');await page.getByRole('button',{name:'Test video player',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(playerLoads,0);
  await page.getByLabel('Streamable video link').fill('https://streamable.com/5rneah');await page.getByRole('button',{name:'Test video player',exact:true}).click();
  await page.getByText('Player loaded. Press Play in the video.').waitFor();assert.equal(playerLoads,1);assert.ok(await clock.evaluate(node=>node===window.__clockNode&&node.contentWindow===window.__clockWindow));assert.ok((await clock.boundingBox()).width<full.width*.4);
  assert.equal(await page.locator('.goal-replay-embed iframe').getAttribute('src'),'https://streamable.com/e/5rneah?autoplay=0&loop=0');
  assert.equal(requests.some(url=>url.includes('embed.reddit.com')),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page overflow');assert.equal(await page.locator('.goal-replay-manual').evaluate(node=>node.scrollWidth>node.clientWidth),false,'manual form fits');
  await page.screenshot({path:'qa-temp/goal-replays-browser/'+label+'-video.png',fullPage:true});
  await page.getByRole('button',{name:'Close replay and return to live match'}).click();assert.equal(await page.locator('.goal-replay-embed iframe').count(),0);assert.ok(await clock.evaluate(node=>node===window.__clockNode));assert.equal((await clock.boundingBox()).width,full.width);
  await page.getByRole('button',{name:'Test video player',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('.goal-replay-stage').count(),0);assert.equal(await page.getByRole('dialog').count(),1);
  await page.getByRole('button',{name:'Test video player',exact:true}).click();await page.getByRole('button',{name:'Video unavailable?',exact:true}).click();assert.equal(await page.locator('.goal-replay-embed iframe').count(),0);assert.equal(await page.getByText('In-app playback is unavailable for this video.').isVisible(),true);
  await page.getByRole('button',{name:'Close Goal Replays test'}).click();await page.getByRole('button',{name:'Test without a live match'}).click();assert.equal(await page.getByLabel('Streamable video link').inputValue(),'');await page.getByRole('button',{name:'Close Goal Replays test'}).click();
  assert.equal(requests.filter(url=>/\/api\/(?:match-live|match-day|match-detail)/.test(url)).length,0);assert.deepEqual(errors,[]);
  console.log(label+': external-only goal fallback, video-only provider, simulator continuity/resize/restore, invalid source, Escape and playback fallback passed');await context.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
