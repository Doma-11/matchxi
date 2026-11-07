import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const records=new Map([['video',[]]]);
globalThis.__raceCatalogue={
 records,
 async get(key){return structuredClone(records.get(key)??null)},
 async list({prefix}){return {blobs:[...records.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}},
 async setJSON(key,value,{onlyIfNew}={}){if(onlyIfNew&&records.has(key))return {modified:false};records.set(key,structuredClone(value));return {modified:true}}
};
const bundle=await build({entryPoints:['app/catalogue-store.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'race-store',setup(b){
 b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'race',namespace:'race'}));
 b.onLoad({filter:/.*/,namespace:'race'},()=>({contents:`export function getStore(){return globalThis.__raceCatalogue}`}));
}}]});
const {saveCatalogue,readCatalogue}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('simultaneous independent catalogue writes preserve both records',async()=>{
 await Promise.all([
  saveCatalogue('video',[{id:'match-a',title:'First'}]),
  saveCatalogue('video',[{id:'match-b',title:'Second'}])
 ]);
 const ids=(await readCatalogue('video')).map(x=>x.id);
 assert.deepEqual(ids.sort(),['match-a','match-b']);
 assert.deepEqual(records.get('video'),[],'legacy snapshot must remain untouched');
});
test('failed immutable batch cannot erase previously committed records',async()=>{
 const previous=globalThis.__raceCatalogue.setJSON;
 globalThis.__raceCatalogue.setJSON=async()=>{throw Error('Storage unavailable')};
 try{await assert.rejects(saveCatalogue('video',[{id:'match-c'}]),/Storage unavailable/);}
 finally{globalThis.__raceCatalogue.setJSON=previous;}
 assert.deepEqual((await readCatalogue('video')).map(x=>x.id).sort(),['match-a','match-b']);
});
test('newer updates replay over older values and retain known video duration',async()=>{
 await saveCatalogue('video',[{id:'match-a',title:'Updated',durationSeconds:563}]);
 await saveCatalogue('video',[{id:'match-a',title:'Later without duration'}]);
 const a=(await readCatalogue('video')).find(x=>x.id==='match-a');
 assert.equal(a.title,'Later without duration');
 assert.equal(a.durationSeconds,563);
});
