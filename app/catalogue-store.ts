import {getStore} from '@netlify/blobs';
import seed from '../public/data/catalogue-seed.json';
const store=()=>getStore({name:'touchline-catalogue',consistency:'strong'});
export async function readCatalogue(kind:string):Promise<any[]>{return await store().get(kind,{type:'json'})||(seed as any)[kind]||[];}
export async function saveCatalogue(kind:string,items:any[]){const old=await readCatalogue(kind),map=new Map(old.map(v=>[kind==='game'?v.league+':'+v.id:v.id,v]));for(const v of items)map.set(kind==='game'?v.league+':'+v.id:v.id,v);await store().setJSON(kind,Array.from(map.values()));}
