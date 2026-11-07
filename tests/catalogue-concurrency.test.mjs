import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';

// The single-snapshot model deliberately matches Touchline. This test documents
// its remaining cross-instance lost-update risk; it does not claim to fix it.
const records=new Map([['video',[]]]);
let reads=0;
let release;
const bothReads=new Promise(resolve=>{release=resolve});
globalThis.__raceCatalogue={
 async get(key){
  const snapshot=structuredClone(records.get(key)??null);
  if(key==='video'&&++reads===2)release();
  if(key==='video')await bothReads;
  return snapshot;
 },
 async setJSON(key,value){records.set(key,structuredClone(value));}
};
const bundle=await build({entryPoints:['app/catalogue-store.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'race-store',setup(b){
 b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'race',namespace:'race'}));
 b.onLoad({filter:/.*/,namespace:'race'},()=>({contents:`export function getStore(){return globalThis.__raceCatalogue}`}));
}}]});
const {saveCatalogue}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('single-snapshot catalogue retains known concurrent lost-update limitation',async()=>{
 await Promise.all([saveCatalogue('video',[{id:'match-a'}]),saveCatalogue('video',[{id:'match-b'}])]);
 assert.equal(records.get('video').length,1,'known limitation: last writer overwrites another concurrent update');
 assert.equal([...records.keys()].length,1,'only one catalogue blob is written');
});
