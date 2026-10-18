import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/player-portraits.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {applyPortraits,findPortrait}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
test('match photos stay primary, saved portraits are fallback only and source data is never mutated',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({portraits:[{name:'Example Player',photo:'/saved-old.webp',source:'official'}]});};
 try{
  const source={game:{date:'2026-10-18T18:00Z'},lineups:[{team:{name:'Arsenal'},players:[{id:'1',name:'Example Player',photo:'https://images.fotmob.com/image_resources/playerimages/1.png',rating:8}]}]};
  const resolved=await applyPortraits(source);assert.equal(resolved.lineups[0].players[0].photo,source.lineups[0].players[0].photo);assert.equal(resolved.lineups[0].players[0].fallbackPhoto,'/saved-old.webp');assert.equal(source.lineups[0].players[0].fallbackPhoto,undefined);
  const again=await applyPortraits(resolved);assert.deepEqual(again,resolved);assert.equal(calls,1);
  const newer=structuredClone(source);newer.lineups[0].players[0].rating=9;
  const updated=await applyPortraits(newer);assert.equal(updated.lineups[0].players[0].rating,9);assert.equal(source.lineups[0].players[0].rating,8);
 }finally{globalThis.fetch=previous;}
});
test('saved photos fill missing images but cannot match ambiguous player aliases',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({portraits:[{name:'No Photo',photo:'/official.webp'}]});
 try{const resolved=await applyPortraits({game:{date:'2026-10-18T18:00Z'},lineups:[{team:{name:'Chelsea'},players:[{id:'2',name:'No Photo'}]}]});assert.equal(resolved.lineups[0].players[0].photo,'/official.webp');}finally{globalThis.fetch=previous;}
 assert.equal(findPortrait([{name:'One Smith',aliases:['Smith']},{name:'Other Smith',aliases:['Smith']}],{name:'Smith'}),undefined);
});
