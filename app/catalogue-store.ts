import {videoDuration} from './video-duration';
import {getStore} from '@netlify/blobs';
import seed from '../public/data/catalogue-seed.json';

// MatchXI has its own store and Netlify site. Keep the original Touchline
// snapshot model: one replaceable JSON blob per catalogue kind.
const store=()=>getStore({name:'matchxi-catalogue',consistency:'strong'});
export async function readCatalogue(kind:string):Promise<any[]>{return await store().get(kind,{type:'json'})||(seed as any)[kind]||[];}
export async function saveCatalogue(kind:string,items:any[]){const old=await readCatalogue(kind),map=new Map(old.map(v=>[kind==='game'?v.league+':'+v.id:v.id,v]));for(const v of items){const key=kind==='game'?v.league+':'+v.id:v.id;const duration=kind==='video'?videoDuration(v)??videoDuration(map.get(key)):null;map.set(key,duration!=null?{...v,durationSeconds:duration}:v);}await store().setJSON(kind,Array.from(map.values()));}
