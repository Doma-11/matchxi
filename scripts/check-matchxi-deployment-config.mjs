import {createHash} from 'node:crypto';
// Offline preflight only. Does not contact Netlify or deploy anything.
const sha256=value=>createHash('sha256').update(value).digest('hex');
const originalSiteIdHash='e73c954d68ddb908c90c3c6b173fc39fc162a9d14da93061ddc4a9975561cb9a';
const originalHostHash='7d8dadc3b24ab0632ec3b720328db31d9a899085ffdb22d8b22bd375840ef2c3';
const errors=[];
const env=process.env;
if(!env.MATCHXI_NETLIFY_SITE_ID)errors.push('MATCHXI_NETLIFY_SITE_ID is missing');
else if(sha256(env.MATCHXI_NETLIFY_SITE_ID)===originalSiteIdHash)errors.push('Original Touchline site ID is forbidden');
if(!env.MATCHXI_SITE_URL)errors.push('MATCHXI_SITE_URL is missing');
else try{
 const u=new URL(env.MATCHXI_SITE_URL);
 if(u.protocol!=='https:'||sha256(u.hostname)===originalHostHash||u.hostname==='matchxi.invalid'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)errors.push('MATCHXI_SITE_URL must be a clean, independent HTTPS origin');
}catch{errors.push('MATCHXI_SITE_URL is invalid');}
if(!env.MATCHXI_REFRESH_SECRET||env.MATCHXI_REFRESH_SECRET.length<32)errors.push('MATCHXI_REFRESH_SECRET must be set to a distinct, high-entropy secret (at least 32 characters)');
if(env.MATCHXI_ENABLE_SCHEDULES==='true')errors.push('Automated schedules must remain disabled until separately approved');
const legacyPrefix=['TOUCH','LINE_'].join('');
if(['REFRESH_SECRET','SETUP_HASH','SETUP_EXPIRES'].some(suffix=>env[legacyPrefix+suffix]))errors.push('Legacy environment variables must not be present');
if(errors.length){console.error('MatchXI deployment preflight FAILED:\n'+errors.map(e=>'- '+e).join('\n'));process.exitCode=1;}
else console.log('MatchXI deployment preflight passed local configuration checks; independent Netlify ownership and secret uniqueness still require external verification.');
