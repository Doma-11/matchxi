import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';

// This test deliberately reproduces the currently known lost-update race.
// It is a characterization test, NOT proof that concurrent writes are safe.
const records=new Map([['video',[]]]);
let waiting=0;
let releaseReads;
const bothReads=new Promise(resolve=>{releaseReads=resolve});
globalThis.__raceCatalogue={records,async get(key){
  const snapshot=structuredClone(records.get(key)||[]);
  waiting++;
  if(waiting===2)releaseReads();
  await bothReads;
  return snapshot;
},async setJSON(key,value){records.set(key,structuredClone(value));}};
const bundle=await build({entryPoints:['app/catalogue-store.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'race-store',setup(b){
 b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'race',namespace:'race'}));
 b.onLoad({filter:/.*/,namespace:'race'},()=>({contents:`export function getStore(){return {get:(key)=>globalThis.__raceCatalogue.get(key),setJSON:(key,value)=>globalThis.__raceCatalogue.setJSON(key,value)}}`}));
}}]});
const {saveCatalogue}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('reproduces concurrent catalogue lost update without contacting Netlify',async()=>{
 await Promise.all([
  saveCatalogue('video',[{id:'match-a',title:'First'}]),
  saveCatalogue('video',[{id:'match-b',title:'Second'}])
 ]);
 const ids=records.get('video').map(x=>x.id);
 assert.equal(ids.length,1,'current read-merge-write implementation loses one concurrent update');
 assert.ok(ids[0]==='match-a'||ids[0]==='match-b');
 delete globalThis.__raceCatalogue;
});
