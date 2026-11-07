import {createHash,createHmac,randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {getStore} from '@netlify/blobs';
export const USERNAME='Dome11';
const COOKIE='__Host-matchxi';
const DAY=86400;
export type Owner={username:string;salt:string;hash:string;revision:string;createdAt:string;disabled?:boolean};
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
let cached:{value:Owner|null;until:number}|undefined;
export const authStore=()=>getStore({name:'matchxi-private-auth',consistency:'strong'});
export async function owner(fresh=false):Promise<Owner|null>{if(!fresh&&cached&&Date.now()<cached.until)return cached.value;const value=await authStore().get('owner',{type:'json'}) as Owner|null;cached={value,until:Date.now()+30000};return value;}
const userCache=new Map<string,{value:Owner|null;until:number}>();
export function validUsername(username:unknown):username is string{return typeof username==='string'&&/^[A-Za-z0-9_-]{3,32}$/.test(username);}
export async function account(username:string,fresh=false):Promise<Owner|null>{
 if(username===USERNAME)return owner(fresh);
 if(!validUsername(username))return null;
 const old=userCache.get(username);if(!fresh&&old&&Date.now()<old.until)return old.value;
 const value=await authStore().get('users/'+username,{type:'json'}) as Owner|null;
 const active=value&&!value.disabled&&value.username===username?value:null;
 userCache.set(username,{value:active,until:Date.now()+30000});if(userCache.size>100)userCache.delete(userCache.keys().next().value!);return active;
}
export const accountKey=(username:string)=>username===USERNAME?'owner':'users/'+username;
export function clearOwnerCache(){cached=undefined;userCache.clear();}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function signingKey(){const key=process.env.MATCHXI_REFRESH_SECRET;if(!key)throw Error('Private access is not configured');return createHmac('sha256',key).update('matchxi-owner-session-v1').digest();}
export async function passwordHash(password:string,salt:string){return (await derive(password,salt)).toString('hex');}
export function validPassword(password:unknown):password is string{return typeof password==='string'&&password.length>=12&&Buffer.byteLength(password)<=256;}
export function sessionCookie(record:Owner,remember=true){const now=Math.floor(Date.now()/1000),age=remember?30*DAY:DAY;const payload=Buffer.from(JSON.stringify({u:record.username,v:record.revision,iat:now,exp:now+age,n:randomBytes(12).toString('hex')})).toString('base64url');const sig=createHmac('sha256',signingKey()).update(payload).digest('base64url');return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict${remember?`; Max-Age=${age}`:''}`;}
export const expiredCookie=()=>`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export async function sessionOwner(request:Request):Promise<Owner|null>{try{const value=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';if(value.length>1024)return null;const [payload,sig,...extra]=value.split('.');if(!payload||!sig||extra.length)return null;const expected=createHmac('sha256',signingKey()).update(payload).digest('base64url');if(!equal(sig,expected))return null;const data=JSON.parse(Buffer.from(payload,'base64url').toString()),now=Math.floor(Date.now()/1000);if(!validUsername(data.u)||!Number.isInteger(data.exp)||!Number.isInteger(data.iat)||data.iat>now+60||data.exp<=now||data.exp-data.iat>30*DAY)return null;const record=await account(data.u);return record?.revision===data.v?record:null;}catch{return null;}}
export function serviceAuthorized(request:Request){const expected=process.env.MATCHXI_REFRESH_SECRET,provided=request.headers.get('x-touchline-refresh')||'';return Boolean(expected&&provided&&equal(expected,provided));}
export const privateHeaders={'Cache-Control':'private, no-store','Netlify-CDN-Cache-Control':'no-store','CDN-Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export function unauthorized(){return Response.json({error:'Sign in to MatchXI',code:'AUTH_REQUIRED'},{status:401,headers:privateHeaders});}
export async function authorize(request:Request){return serviceAuthorized(request)||Boolean(await sessionOwner(request));}
export function protectResponse(response:Response){const headers=new Headers(response.headers);headers.set('Netlify-CDN-Cache-Control','no-store');headers.set('CDN-Cache-Control','no-store');headers.set('Vary','Cookie');headers.set('Cache-Control',response.headers.get('content-type')?.startsWith('image/')?'private, max-age=86400':'private, max-age=30');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
export function validSetupToken(token:unknown){return typeof token==='string'&&token.length===64&&Date.now()<Number(process.env.MATCHXI_SETUP_EXPIRES)&&equal(createHash('sha256').update(token).digest('hex'),process.env.MATCHXI_SETUP_HASH||'');}
