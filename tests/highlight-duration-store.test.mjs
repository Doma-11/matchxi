import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const records=new Map([['video',[{id:'abcdefghijk',title:'Old title',durationSeconds:563}]],['game',[{id:'1',league:'eng.1',durationSeconds:563}]]]);globalThis.__durationCatalogueRecords=records;
const result=await build({entryPoints:['app/catalogue-store.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'isolated-store',setup(b){b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'mock',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export function getStore(){return {get:async key=>globalThis.__durationCatalogueRecords.get(key)||null,setJSON:async(key,value)=>globalThis.__durationCatalogueRecords.set(key,value)}}'}));}}]});
const {saveCatalogue}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('known highlight lengths survive later feeds without duration; newly published lengths replace old values',async()=>{
 await saveCatalogue('video',[{id:'abcdefghijk',title:'New title'},{id:'12345678901',title:'Unknown duration'}]);let videos=records.get('video');assert.equal(videos[0].durationSeconds,563);assert.equal(videos[0].title,'New title');assert.equal(videos[1].durationSeconds,undefined);
 await saveCatalogue('video',[{id:'abcdefghijk',title:'Corrected',durationSeconds:600}]);assert.equal(records.get('video')[0].durationSeconds,600);
 await saveCatalogue('game',[{id:'1',league:'eng.1',state:'post'}]);assert.equal(records.get('game')[0].durationSeconds,undefined,'video duration preservation does not alter fixture writes');
 delete globalThis.__durationCatalogueRecords;
});
