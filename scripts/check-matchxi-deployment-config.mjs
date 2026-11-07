// Offline preflight only. Does not contact Netlify or deploy anything.
const originalSiteId='50f08265-7afe-4542-ad4f-d8a92823d202';
const originalHost='touchline-football-hub.netlify.app';
const errors=[];
const env=process.env;
if(!env.MATCHXI_NETLIFY_SITE_ID)errors.push('MATCHXI_NETLIFY_SITE_ID is missing');
else if(env.MATCHXI_NETLIFY_SITE_ID===originalSiteId)errors.push('Original Touchline site ID is forbidden');
if(!env.MATCHXI_SITE_URL)errors.push('MATCHXI_SITE_URL is missing');
else try{
 const u=new URL(env.MATCHXI_SITE_URL);
 if(u.protocol!=='https:'||u.hostname===originalHost||u.hostname==='matchxi.invalid'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)errors.push('MATCHXI_SITE_URL must be a clean, independent HTTPS origin');
}catch{errors.push('MATCHXI_SITE_URL is invalid');}
if(!env.MATCHXI_REFRESH_SECRET||env.MATCHXI_REFRESH_SECRET.length<32)errors.push('MATCHXI_REFRESH_SECRET must be set to a distinct, high-entropy secret (at least 32 characters)');
if(env.MATCHXI_ENABLE_SCHEDULES==='true')errors.push('Automated schedules must remain disabled until separately approved');
if(env.TOUCHLINE_REFRESH_SECRET||env.TOUCHLINE_SETUP_HASH||env.TOUCHLINE_SETUP_EXPIRES)errors.push('Legacy Touchline environment variables must not be present');
if(errors.length){console.error('MatchXI deployment preflight FAILED:\n'+errors.map(e=>'- '+e).join('\n'));process.exitCode=1;}
else console.log('MatchXI deployment preflight passed local configuration checks; independent Netlify ownership and secret uniqueness still require external verification.');
