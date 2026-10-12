import {unlink} from 'node:fs/promises';
import {build} from 'esbuild';import assert from 'node:assert/strict';import {randomBytes,createHash,createHmac} from 'node:crypto';
const out='tests/.auth-under-test.mjs';
await build({entryPoints:['netlify/functions/auth.ts'],bundle:true,platform:'node',format:'esm',outfile:out,plugins:[{name:'fake-blobs',setup(b){b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'blobs',namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},()=>({contents:`const records=new Map();export function getStore(){return {get:async(k)=>records.get(k)||null,setJSON:async(k,v,o)=>{if(o?.onlyIfNew&&records.has(k))return {modified:false};records.set(k,v);return {modified:true}}}}`}))}}]});
const {default:handle}=await import('./.auth-under-test.mjs');
process.env.TOUCHLINE_REFRESH_SECRET=randomBytes(32).toString('hex');const token=randomBytes(32).toString('hex');process.env.TOUCHLINE_SETUP_HASH=createHash('sha256').update(token).digest('hex');process.env.TOUCHLINE_SETUP_EXPIRES=String(Date.now()+60000);
const host='https://touchline-football-hub.netlify.app';const pass=randomBytes(24).toString('hex');
function req(body,cookie='',origin=host){return new Request(host+'/api/auth',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:JSON.stringify(body)})}
async function post(body,cookie='',origin=host){return handle(req(body,cookie,origin))}
assert.equal((await post({action:'setup',token,password:pass},'','https://evil.example')).status,403);
assert.equal((await post({action:'setup',token:'x'.repeat(64),password:pass})).status,403);
assert.equal((await post({action:'setup',token,password:'short'})).status,400);
const setup=await post({action:'setup',token,password:pass});assert.equal(setup.status,200);const cookie=setup.headers.get('set-cookie');for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=2592000','Path=/'])assert.ok(cookie.includes(flag));
assert.equal((await post({action:'setup',token,password:pass})).status,409);
assert.equal((await post({action:'login',username:'wrong',password:pass})).status,401);
assert.equal((await post({action:'login',username:'Dome11',password:'wrong'})).status,401);
const login=await post({action:'login',username:'Dome11',password:pass,remember:false});assert.equal(login.status,200);assert.ok(!login.headers.get('set-cookie').includes('Max-Age'));
async function session(c){return (await handle(new Request(host+'/api/auth',{headers:{cookie:c}}))).json()}
assert.equal((await session(cookie)).authenticated,true);assert.equal((await session(cookie.replace('__Host-touchline=','__Host-touchline=x'))).authenticated,false);
const original=cookie.split(';')[0].split('=')[1];const payload=JSON.parse(Buffer.from(original.split('.')[0],'base64url').toString());payload.iat=Math.floor(Date.now()/1000)-60;payload.exp=Math.floor(Date.now()/1000)-1;const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');const key=createHmac('sha256',process.env.TOUCHLINE_REFRESH_SECRET).update('touchline-owner-session-v1').digest();const sig=createHmac('sha256',key).update(encoded).digest('base64url');assert.equal((await session('__Host-touchline='+encoded+'.'+sig)).authenticated,false);
const next=randomBytes(24).toString('hex');assert.equal((await post({action:'password',currentPassword:'bad',password:next},cookie)).status,401);
const changed=await post({action:'password',currentPassword:pass,password:next},cookie);assert.equal(changed.status,200);assert.equal((await session(cookie)).authenticated,false);assert.equal((await session(changed.headers.get('set-cookie'))).authenticated,true);
const logout=await post({action:'logout'},changed.headers.get('set-cookie'));assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
assert.equal((await post({action:'login',username:'Dome11',password:pass})).status,401);
console.log('PASS: secure setup, no registration/overwrite, CSRF, password validation, login, cookie flags, tampering, password/session rotation and logout.');

await unlink(out);
