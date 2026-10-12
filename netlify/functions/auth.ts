import type {Config} from '@netlify/functions';
import {randomBytes} from 'node:crypto';
import {USERNAME,authStore,owner,clearOwnerCache,equal,passwordHash,validPassword,sessionCookie,expiredCookie,sessionOwner,privateHeaders,validSetupToken} from '../lib/private-auth';
const json=(data:any,status=200,cookie?:string)=>Response.json(data,{status,headers:{...privateHeaders,...(cookie?{'Set-Cookie':cookie}:{})}});
export default async function(request:Request){
 try{
  if(request.method==='GET'){const record=await sessionOwner(request);return json({authenticated:Boolean(record),username:record?.username,setupRequired:!(await owner())});}
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Request origin rejected'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  const text=await request.text();if(Buffer.byteLength(text)>2048)return json({error:'Request too large'},413);
  let body:any;try{body=JSON.parse(text)}catch{return json({error:'Invalid request'},400)}
  if(!body||typeof body!=='object')return json({error:'Invalid request'},400);
  if(body.action==='logout')return json({ok:true},200,expiredCookie());
  if(body.action==='setup'){
   if(!validSetupToken(body.token))return json({error:'This setup link is invalid or expired.'},403);
   if(await owner(true))return json({error:'Account already set up. Please sign in.'},409);
   if(!validPassword(body.password))return json({error:'Use at least 12 characters (maximum 256 bytes).'},400);
   const salt=randomBytes(24).toString('hex'),record={username:USERNAME,salt,hash:await passwordHash(body.password,salt),revision:randomBytes(24).toString('hex'),createdAt:new Date().toISOString()};
   const written=await authStore().setJSON('owner',record,{onlyIfNew:true});clearOwnerCache();
   if(!written.modified)return json({error:'Account already set up. Please sign in.'},409);
   return json({ok:true,username:USERNAME},200,sessionCookie(record,body.remember!==false));
  }
  if(body.action==='login'){
   const record=await owner(true),password=typeof body.password==='string'&&Buffer.byteLength(body.password)<=256?body.password:'';
   const hash=await passwordHash(password,record?.salt||'touchline-no-account-dummy-salt');
   if(!record||body.username!==USERNAME||!equal(hash,record.hash))return json({error:'Incorrect username or password.'},401);
   return json({ok:true,username:USERNAME},200,sessionCookie(record,body.remember!==false));
  }
  if(body.action==='password'){
   const record=await sessionOwner(request);if(!record)return json({error:'Please sign in again.'},401);
   if(typeof body.currentPassword!=='string'||Buffer.byteLength(body.currentPassword)>256||!equal(await passwordHash(body.currentPassword,record.salt),record.hash))return json({error:'Current password is incorrect.'},401);
   if(!validPassword(body.password))return json({error:'Use at least 12 characters (maximum 256 bytes).'},400);
   const salt=randomBytes(24).toString('hex'),updated={...record,salt,hash:await passwordHash(body.password,salt),revision:randomBytes(24).toString('hex')};
   await authStore().setJSON('owner',updated);clearOwnerCache();
   return json({ok:true},200,sessionCookie(updated,body.remember!==false));
  }
  return json({error:'Unknown action'},400);
 }catch{return json({error:'Sign-in is temporarily unavailable. Try again shortly.'},503)}
}
export const config:Config={path:['/api/auth','/.netlify/functions/auth'],rateLimit:{windowLimit:12,windowSize:60,aggregateBy:['ip','domain']}};
