import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/stream-browser-link.ts'],bundle:true,platform:'node',format:'esm',write:false});const {streamBrowserLink}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
const url='https://www.soccerstreams.zone/hd-1/?one=1&two=2';
test('external stream links remain ordinary HTTPS on all supported devices and browsers',()=>{for(const [ua,touch] of [['iPhone',0],['iPad',0],['Macintosh',5],['Android Chrome',0],['Android Firefox',0],['Windows Chrome',0],['Windows Firefox',0],['Macintosh',0]])assert.equal(streamBrowserLink(url,ua,touch),url);});
