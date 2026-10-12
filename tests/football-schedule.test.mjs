import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const compiled=await build({entryPoints:['netlify/lib/football-schedule.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {slot,api}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('Zagreb summer, winter and DST changes retain exact times and target dates',()=>{
 for(const [stamp,date,id] of [['2026-10-06T21:30Z','2026-10-06','2026-10-06/2330'],['2026-12-06T22:30Z','2026-12-06','2026-12-06/2330'],['2026-10-06T10:45Z','2026-10-05','2026-10-06/1245'],['2026-12-06T11:45Z','2026-12-05','2026-12-06/1245'],['2026-10-25T11:45Z','2026-10-24','2026-10-25/1245']])assert.deepEqual(slot(new Date(stamp)),{date,id});
 for(const stamp of ['2026-10-06T22:30Z','2026-12-06T21:30Z','2026-10-06T11:45Z','2026-12-06T10:45Z'])assert.equal(slot(new Date(stamp)),null);
});
test('transient errors retry once, credentials stay in header to fixed host, permanent errors do not retry',async()=>{
 const previous=globalThis.fetch;process.env.TOUCHLINE_REFRESH_SECRET='test-only';let calls=0;
 try{globalThis.fetch=async(url,options)=>{calls++;assert.ok(url.startsWith('https://touchline-football-hub.netlify.app/api/'));assert.equal(options.headers['x-touchline-refresh'],'test-only');assert.equal(options.redirect,'error');return new Response(JSON.stringify({ok:true}),{status:calls===1?503:200})};assert.deepEqual(await api('/api/catalogue'),{ok:true});assert.equal(calls,2);
 calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:401})};await assert.rejects(api('/api/catalogue'),/401/);assert.equal(calls,1);
 }finally{globalThis.fetch=previous;delete process.env.TOUCHLINE_REFRESH_SECRET;}
});
