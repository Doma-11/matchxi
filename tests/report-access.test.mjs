import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,createHash} from 'node:crypto';
const code=await build({stdin:{contents:`export {default as auth} from './netlify/functions/auth';export {reportAccessDenied} from './netlify/lib/report-access';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'auth-store',setup(b){b.onResolve({filter:/^@netlify\/blobs$/},()=>({path:'blobs',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`const rows=new Map();export function getStore(){return {get:async k=>rows.get(k)||null,setJSON:async(k,v,o)=>{if(o?.onlyIfNew&&rows.has(k))return {modified:false};rows.set(k,v);return {modified:true}}}}`}));}}]});
const {auth,reportAccessDenied}=await import('data:text/javascript;base64,'+Buffer.from(code.outputFiles[0].text).toString('base64'));
test('reports allow only authenticated AdminDom or the private scheduler, including direct route access',async()=>{
 process.env.MATCHXI_REFRESH_SECRET=randomBytes(32).toString('hex');const token=randomBytes(32).toString('hex'),pass=randomBytes(24).toString('hex');process.env.MATCHXI_SETUP_HASH=createHash('sha256').update(token).digest('hex');process.env.MATCHXI_SETUP_EXPIRES=String(Date.now()+60000);
 const host='https://touchline.test';const post=(body,cookie='',service=false)=>auth(new Request(host+'/api/auth',{method:'POST',headers:{Origin:host,'Content-Type':'application/json',cookie,...(service?{'x-matchxi-refresh':process.env.MATCHXI_REFRESH_SECRET}:{})},body:JSON.stringify(body)}));
 const owner=await post({action:'setup',token,password:pass});assert.equal(owner.status,200);
 const invite=await post({action:'invite',username:'UserTest'},'',true),details=await invite.json(),fragment=new URLSearchParams(new URL(details.setupUrl).hash.slice(1));
 const member=await post({action:'accept-invite',username:'UserTest',token:fragment.get('invite'),password:pass});assert.equal(member.status,200);
 for(const route of ['daily-report','usage-reports']){
  const req=(headers={})=>new Request(host+'/api/'+route,{headers});
  assert.equal((await reportAccessDenied(req())).status,401);
  assert.equal(await reportAccessDenied(req({cookie:owner.headers.get('set-cookie')})),null);
  assert.equal((await reportAccessDenied(req({cookie:member.headers.get('set-cookie')}))).status,403);
  assert.equal((await reportAccessDenied(req({'x-username':'AdminDom'}))).status,401);
  assert.equal(await reportAccessDenied(req({'x-matchxi-refresh':process.env.MATCHXI_REFRESH_SECRET})),null);
 }
});
