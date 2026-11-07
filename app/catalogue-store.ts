import {randomUUID} from 'node:crypto';
import {videoDuration} from './video-duration';
import {getStore} from '@netlify/blobs';
import seed from '../public/data/catalogue-seed.json';

const store=()=>getStore({name:'matchxi-catalogue',consistency:'strong'});
const kinds=new Set(['video','game','status','dashboard']);
function identity(kind:string,item:any){
 if(kind==='game')return String(item?.league)+':'+String(item?.id);
 return String(item?.id);
}
function merge(kind:string,old:any[],updates:any[]){
 const map=new Map(old.map(v=>[identity(kind,v),v]));
 for(const v of updates){
  const key=identity(kind,v),previous=map.get(key);
  const duration=kind==='video'?videoDuration(v)??videoDuration(previous):null;
  map.set(key,duration!=null?{...v,durationSeconds:duration}:v);
 }
 return [...map.values()];
}
export async function readCatalogue(kind:string):Promise<any[]>{
 if(!kinds.has(kind))throw Error('Invalid catalogue kind');
 const s=store();
 // Legacy snapshots remain read-only: never overwrite or delete existing data.
 let result:any[]=await s.get(kind,{type:'json'})||(seed as any)[kind]||[];
 const {blobs}=await s.list({prefix:`updates/${kind}/`});
 // Each batch is immutable and independently written. Sorting gives deterministic
 // replay order for updates to the same ID, without a shared read/modify/write key.
 for(const entry of blobs.sort((a,b)=>a.key.localeCompare(b.key))){
  const updates:any=await s.get(entry.key,{type:'json'});
  if(!Array.isArray(updates))throw Error('Invalid catalogue update batch');
  result=merge(kind,result,updates);
 }
 return result;
}
export async function saveCatalogue(kind:string,items:any[]){
 if(!kinds.has(kind)||!Array.isArray(items))throw Error('Invalid catalogue update');
 if(!items.length)return;
 for(const item of items)if(!item||typeof item!=='object'||item.id==null||(kind==='game'&&!item.league))throw Error('Invalid catalogue record');
 // One atomic, immutable batch per save: concurrent writers never replace each
 // other's data. A failed write leaves the previous catalogue untouched.
 const key=`updates/${kind}/${String(Date.now()).padStart(13,'0')}-${randomUUID()}`;
 const result=await store().setJSON(key,items,{onlyIfNew:true});
 if(!result.modified)throw Error('Catalogue update was not saved');
}
