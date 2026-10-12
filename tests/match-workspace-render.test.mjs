import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
await mkdir('qa-temp',{recursive:true});
const compiled=await build({entryPoints:['app/match-centre.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,jsx:'automatic'});
await writeFile('qa-temp/match-workspace-render.mjs',compiled.outputFiles[0].text);
const {MatchWorkspace}=await import('../qa-temp/match-workspace-render.mjs');
const game={id:'123',league:'eng.1',date:'2026-10-11T14:00:00Z',home:{id:'1',name:'Home',score:1},away:{id:'2',name:'Away',score:0},completed:true,state:'post',status:'Full time'};
for(const state of ['pre','in','post'])for(const tab of ['details','lineups','statistics','standings','highlights'])test(`match screen renders ${state}/${tab} without data or a crash`,()=>{
 const previous=globalThis.sessionStorage;globalThis.sessionStorage={getItem:()=>tab};
 try{const html=renderToStaticMarkup(React.createElement(MatchWorkspace,{game:{...game,state,completed:state==='post'},videos:[],onBack(){}}));assert.match(html,/Back to matches/);assert.match(html,/Home/);assert.match(html,/Away/);assert.match(html,/match-workspace/)}finally{globalThis.sessionStorage=previous}
});
