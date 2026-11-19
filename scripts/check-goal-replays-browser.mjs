// Local-only browser regression. All provider responses are mocked: this does
// NOT establish real Reddit/Streamin playback or physical-phone compatibility.
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
const server=createServer(async(req,res)=>{try{if(['/app.js','/app.css'].includes(req.url)){res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile('qa-temp/goal-replays-browser'+req.url));}else if(req.url.startsWith('/themes/')){res.setHeader('Content-Type','image/webp');res.end(await readFile('public'+req.url));}else if(req.url.startsWith('/api/match-streams')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({streams:[{url:'https://www.soccerstreams.zone/watch/test.htm'}]}));}else if(req.url.startsWith('/api/stream-player')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({embedAllowed:true,embedUrl:'https://dlive.sx/stream/test.php'}));}else{res.setHeader('Content-Type','text/html');res.end(html);}}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const [label,width,height,league] of [['desktop',1100,850,'uefa.champions'],['phone',390,844,'uefa.europa'],['small-phone',320,700,'uefa.champions'],['landscape',844,390,'uefa.champions']]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],requests=[];let liveLoads=0,widgetLoads=0;
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  await page.route('**/*',async route=>{const url=route.request().url();if(url.startsWith(origin))return route.continue();if(url==='https://dlive.sx/stream/test.php'){liveLoads++;return route.fulfill({contentType:'text/html',body:'<html><body>Mock live stream<script>window.started=Date.now()</script></body></html>'});}if(url==='https://embed.reddit.com/widgets.js'){widgetLoads++;return route.fulfill({contentType:'text/javascript',body:'const player=document.createElement("iframe");player.srcdoc="<p>Mock official Reddit post</p>";document.body.appendChild(player);'});}return route.abort();});
  await page.goto(origin+'/?league='+league);
  assert.equal(await page.getByRole('switch',{name:'Enable Goal Replays preview'}).getAttribute('aria-checked'),'false');
  await page.getByRole('switch',{name:'Enable Goal Replays preview'}).click();
  await page.getByRole('button',{name:'Play stream 1 in app'}).click();
  const live=page.locator('.stream-viewport > iframe');await live.waitFor();
  await live.evaluate(node=>{window.__liveNode=node;window.__liveWindow=node.contentWindow;});
  const large=await live.boundingBox();assert.ok(large.width>250);
  await page.getByRole('button',{name:'Load test replay'}).click();assert.equal(widgetLoads,0);
  await page.getByRole('button',{name:'Replay test goal: Florian Wirtz, Germany, 60 minutes'}).click();
  await page.getByText('Reddit post loaded; video playback is not verified.').waitFor();
  assert.equal(widgetLoads,1);assert.equal(liveLoads,1);assert.ok(await live.evaluate(node=>node===window.__liveNode&&node.contentWindow===window.__liveWindow));
  const small=await live.boundingBox();assert.ok(small.width<large.width*.4);
  assert.equal(await page.locator('.stream-popup').evaluate(node=>node.style.getPropertyValue('--accent')),league==='uefa.europa'?'#ff8a32':'#62c7ff');
  await page.screenshot({path:'qa-temp/goal-replays-browser/'+label+'-replay.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page overflow');
  assert.equal(await page.locator('.goal-replays').evaluate(node=>node.scrollWidth>node.clientWidth),false,'goal list fits');
  await page.getByRole('button',{name:'Close replay and return to live match'}).click();
  assert.equal(await page.locator('.goal-replay-embed iframe').count(),0);assert.equal(liveLoads,1);assert.ok(await live.evaluate(node=>node===window.__liveNode));assert.equal((await live.boundingBox()).width,large.width);
  await page.getByRole('button',{name:'Replay test goal: Florian Wirtz, Germany, 60 minutes'}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('.goal-replay-stage').count(),0);assert.equal(await page.getByRole('dialog').count(),1);
  await page.getByRole('button',{name:'Replay test goal: Florian Wirtz, Germany, 60 minutes'}).click();
  await page.evaluate(()=>{localStorage.setItem('matchxi-goal-replays-poc','off');window.dispatchEvent(new CustomEvent('matchxi-goal-replays-change',{detail:false}));});
  await page.locator('.goal-replay-stage').waitFor({state:'detached'});assert.ok(await live.evaluate(node=>node===window.__liveNode));assert.equal(await page.locator('.goal-replays').count(),0);assert.equal(liveLoads,1);
  assert.equal(requests.filter(url=>/\/api\/(?:match-live|match-day|match-detail)/.test(url)).length,0);assert.deepEqual(errors,[]);
  await page.getByRole('button',{name:'Close livestream'}).click();
  // The Settings lab lets the owner try the real embed without a live fixture.
  await page.getByRole('switch',{name:'Enable Goal Replays preview'}).click();await page.getByRole('button',{name:'Test without a live match'}).click();await page.getByRole('button',{name:'Load test replay'}).click();await page.getByRole('button',{name:'Replay test goal: Florian Wirtz, Germany, 60 minutes'}).click();await page.getByRole('button',{name:'Close replay and return to live match'}).click();await page.getByRole('button',{name:'Close Goal Replays test'}).click();
  console.log(label+': iframe identity, resize/restore, close/Escape, kill switch, theme, no score requests, Settings lab passed');await context.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
