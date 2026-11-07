import type {Config} from '@netlify/functions';
import {randomBytes,createHash} from 'node:crypto';
import {USERNAME,authStore,owner,account,accountKey,validUsername,serviceAuthorized,clearOwnerCache,equal,passwordHash,validPassword,sessionCookie,expiredCookie,sessionOwner,privateHeaders,validSetupToken} from '../lib/private-auth';
const json=(data:any,status=200,cookie?:string)=>Response.json(data,{status,headers:{...privateHeaders,...(cookie?{'Set-Cookie':cookie}:{})}});
export default async function(request:Request){
 try{
  if(request.method==='GET'){const record=await sessionOwner(request);return json({authenticated:Boolean(record),username:record?.username,role:record?.username===USERNAME?'owner':record?'member':undefined,setupRequired:!(await owner())});}
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Request origin rejected'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  const text=await request.text();if(Buffer.byteLength(text)>2048)return json({error:'Request too large'},413);
  let body:any;try{body=JSON.parse(text)}catch{return json({error:'Invalid request'},400)}
  if(!body||typeof body!=='object')return json({error:'Invalid request'},400);
  if(body.action==='logout')return json({ok:true},200,expiredCookie());
  if(body.action==='invite'||body.action==='revoke'){
   const actor=await sessionOwner(request);if(!serviceAuthorized(request)&&actor?.username!==USERNAME)return json({error:'Only the owner can manage accounts.'},403);
   if(!(await owner(true)))return json({error:'Set up the owner first.'},409);
   if(!validUsername(body.username)||body.username.toLowerCase()===USERNAME.toLowerCase())return json({error:'Use a different username with 3–32 letters, numbers, underscores or hyphens.'},400);
   const existing=await account(body.username,true);
   if(body.action==='revoke'){
    if(!existing)return json({error:'Account not found.'},404);
    await authStore().setJSON(accountKey(existing.username),{...existing,disabled:true,revision:randomBytes(24).toString('hex')});clearOwnerCache();return json({ok:true});
   }
   if(await authStore().get(accountKey(body.username),{type:'json'}))return json({error:'That account already exists.'},409);
   const token=randomBytes(32).toString('hex'),digest=createHash('sha256').update(token).digest('hex'),expiresAt=Date.now()+48*3600000;
   await authStore().setJSON('invites/'+digest,{username:body.username,expiresAt,createdAt:new Date().toISOString()});
   const fragment=new URLSearchParams({invite:token,username:body.username});
   return json({ok:true,username:body.username,expiresAt:new Date(expiresAt).toISOString(),setupUrl:new URL('/#'+fragment,new URL(request.url).origin).toString()});
  }
  if(body.action==='invite-info'||body.action==='accept-invite'){
   if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return json({error:'This invitation is invalid or expired.'},403);
   const digest=createHash('sha256').update(body.token).digest('hex'),key='invites/'+digest;
   const invitation:any=await authStore().get(key,{type:'json'});
   if(!invitation||invitation.used||Date.now()>=invitation.expiresAt||!validUsername(invitation.username)||invitation.username.toLowerCase()===USERNAME.toLowerCase())return json({error:'This invitation is invalid or expired.'},403);
   if(body.action==='invite-info')return json({ok:true,username:invitation.username});
   if(body.username!==invitation.username)return json({error:'Invitation username does not match.'},403);
   if(!validPassword(body.password))return json({error:'Use at least 12 characters (maximum 256 bytes).'},400);
   const salt=randomBytes(24).toString('hex'),record={username:invitation.username,salt,hash:await passwordHash(body.password,salt),revision:randomBytes(24).toString('hex'),createdAt:new Date().toISOString()};
   const written=await authStore().setJSON(accountKey(record.username),record,{onlyIfNew:true});clearOwnerCache();
   if(!written.modified)return json({error:'Account already set up. Please sign in.'},409);
   await authStore().setJSON(key,{...invitation,used:true});
   return json({ok:true,username:record.username},200,sessionCookie(record,body.remember!==false));
  }
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
   const record=validUsername(body.username)?await account(body.username,true):null,password=typeof body.password==='string'&&Buffer.byteLength(body.password)<=256?body.password:'';
   const hash=await passwordHash(password,record?.salt||'matchxi-no-account-dummy-salt');
   if(!record||body.username!==record.username||!equal(hash,record.hash))return json({error:'Incorrect username or password.'},401);
   return json({ok:true,username:record.username},200,sessionCookie(record,body.remember!==false));
  }
  if(body.action==='password'){
   const record=await sessionOwner(request);if(!record)return json({error:'Please sign in again.'},401);
   if(typeof body.currentPassword!=='string'||Buffer.byteLength(body.currentPassword)>256||!equal(await passwordHash(body.currentPassword,record.salt),record.hash))return json({error:'Current password is incorrect.'},401);
   if(!validPassword(body.password))return json({error:'Use at least 12 characters (maximum 256 bytes).'},400);
   const salt=randomBytes(24).toString('hex'),updated={...record,salt,hash:await passwordHash(body.password,salt),revision:randomBytes(24).toString('hex')};
   await authStore().setJSON(accountKey(record.username),updated);clearOwnerCache();
   return json({ok:true},200,sessionCookie(updated,body.remember!==false));
  }
  return json({error:'Unknown action'},400);
 }catch{return json({error:'Sign-in is temporarily unavailable. Try again shortly.'},503)}
}
export const config:Config={path:['/api/auth','/.netlify/functions/auth'],rateLimit:{windowLimit:12,windowSize:60,aggregateBy:['ip','domain']}};
