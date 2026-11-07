import {readFile,writeFile} from 'node:fs/promises';import {getStore} from '@netlify/blobs';import {createHash} from 'node:crypto';
// Never target the original Touchline site. A MatchXI-only site ID and token
// must be provided explicitly when this manual upload is authorized.
const siteID=process.env.MATCHXI_NETLIFY_SITE_ID;
const token=process.env.MATCHXI_NETLIFY_BLOBS_TOKEN;
if(!siteID||!token)throw Error('Set independent MATCHXI_NETLIFY_SITE_ID and MATCHXI_NETLIFY_BLOBS_TOKEN before uploading.');
if(siteID==='50f08265-7afe-4542-ad4f-d8a92823d202')throw Error('Original Touchline Netlify site ID is forbidden.');
const store=getStore({name:'matchxi-player-portraits',siteID,token,fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})});
const portraits=JSON.parse(await readFile('app/player-portraits.json','utf8'));let done=0,failed=0;const jobs=portraits.filter(p=>p.blobKey&&p.ready);let cursor=0;
async function worker(){while(cursor<jobs.length){const p=jobs[cursor++];try{const bytes=await readFile('qa-temp/expanded-portraits/'+p.blobKey+'.webp');await store.set(p.blobKey,bytes,{metadata:{contentType:'image/webp',team:p.team,player:p.name,season:p.season,source:p.source}});done++}catch{failed++}if((done+failed)%25===0)console.log('Stored portraits:',done,'/',jobs.length,'failures:',failed)}}
await Promise.all(Array.from({length:8},worker));console.log('Portrait storage finished:',done,'saved;',failed,'failed');if(failed)process.exitCode=1;
