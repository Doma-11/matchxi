import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const b=await build({entryPoints:['app/projector-mode.ts'],bundle:true,platform:'node',format:'esm',write:false});const {projectorMode,setProjectorMode,initializeProjectorMode,projectorNeighbour,handleProjectorKey}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('Projector preference persists locally and applies on startup even when storage is unavailable',()=>{
 const old={document:globalThis.document,localStorage:globalThis.localStorage},store=new Map();globalThis.document={documentElement:{dataset:{}}};globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 try{assert.equal(projectorMode(),false);setProjectorMode(true);assert.equal(projectorMode(),true);assert.equal(document.documentElement.dataset.projector,'on');document.documentElement.dataset.projector='off';initializeProjectorMode();assert.equal(document.documentElement.dataset.projector,'on');setProjectorMode(false);assert.equal(projectorMode(),false);globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};setProjectorMode(true);assert.equal(document.documentElement.dataset.projector,'on');assert.equal(projectorMode(),false);}finally{Object.assign(globalThis,old);}
});
test('Projector spatial navigation picks visible controls in the requested direction without wrapping',()=>{
 const boxes=[{left:0,top:0,width:60,height:40},{left:100,top:0,width:60,height:40},{left:0,top:100,width:60,height:40},{left:100,top:100,width:60,height:40}];
 assert.equal(projectorNeighbour(boxes,0,'ArrowRight'),1);assert.equal(projectorNeighbour(boxes,0,'ArrowDown'),2);assert.equal(projectorNeighbour(boxes,3,'ArrowUp'),1);assert.equal(projectorNeighbour(boxes,0,'ArrowLeft'),-1);assert.equal(projectorNeighbour(boxes,-1,'ArrowDown'),0);
});
test('Projector shortcuts are scoped, preserve native editing and modifiers, and navigate without playback requests',()=>{
 const old=globalThis.document;globalThis.document={documentElement:{dataset:{projector:'on'}}};let focused=0,full=0,back=0;
 const controls=[0,1].map(i=>({closest:()=>null,getAttribute:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({left:i*100,top:0,width:50,height:40}),contains:n=>n===controls[i],focus(){focused=i+1;},scrollIntoView(){}}));const root={querySelectorAll:()=>controls};
 const event=(key,target=controls[0],extra={})=>({key,target,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...extra});
 try{let e=event('ArrowRight');assert.equal(handleProjectorKey(e,root),true);assert.equal(focused,2);assert.equal(e.defaultPrevented,true);handleProjectorKey(event('f'),root,{fullscreen:()=>full++});handleProjectorKey(event('BrowserBack'),root,{back:()=>back++});assert.equal(full,1);assert.equal(back,1);
 assert.equal(handleProjectorKey(event('f',{closest:()=>({})}),root,{fullscreen:()=>full++}),false);assert.equal(handleProjectorKey(event('f',controls[0],{ctrlKey:true}),root,{fullscreen:()=>full++}),false);assert.equal(full,1);document.documentElement.dataset.projector='off';assert.equal(handleProjectorKey(event('ArrowRight'),root),false);
 }finally{globalThis.document=old;}
});
