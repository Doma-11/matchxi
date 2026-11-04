import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/stream-browser-link.ts'],bundle:true,platform:'node',format:'esm',write:false});const {streamBrowserLink}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
const url='https://www.soccerstreams.zone/hd-1/?one=1&two=2';
test('Apple mobile Firefox scheme preserves the entire target URL',()=>{for(const [ua,touch] of [['iPhone',0],['iPad',0],['Macintosh',5]])assert.equal(new URL(streamBrowserLink(url,ua,touch)).searchParams.get('url'),url);});
test('Android prefers Firefox with a normal browser fallback; desktop retains HTTPS',()=>{const android=streamBrowserLink(url,'Android');assert.ok(android.includes('package=org.mozilla.firefox'));assert.ok(android.includes(encodeURIComponent(url)));assert.equal(streamBrowserLink(url,'Windows Chrome'),url);assert.equal(streamBrowserLink(url,'Macintosh',0),url);});
