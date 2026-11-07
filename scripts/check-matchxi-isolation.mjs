import {readdirSync,readFileSync} from 'node:fs';
import {join,extname} from 'node:path';
const roots=['app','netlify','scripts','main.tsx','index.html','public/manifest.webmanifest','public/sw.js'];
const sourceExt=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.html','.webmanifest']);
const issues=[];
function check(path){if(path.endsWith('check-matchxi-isolation.mjs'))return;const s=readFileSync(path,'utf8');for(const [i,line] of s.split(/\r?\n/).entries()){
 if(/TOUCHLINE_(?:REFRESH_SECRET|SETUP_HASH|SETUP_EXPIRES)|x-touchline-refresh|__Host-touchline|touchline-(?:private-auth|response-cache|scheduled-runs|catalogue|match-details|match-polls|reports|usage|netlify-usage|player-fixtures|daily-reports|daily-highlight-checks|stream-players|stream-listings|player-portraits)/i.test(line))issues.push(path+':'+(i+1)+' legacy Touchline credential or storage');
 if(/50f08265-7afe-4542-ad4f-d8a92823d202/.test(line))issues.push(path+':'+(i+1)+' original Netlify site identifier');
 if(/touchline-football-hub\.netlify\.app/.test(line)&&!path.endsWith('football-schedule.ts')&&!(/url\.hostname\s*==/.test(line)&&path.endsWith('private-request.py')))issues.push(path+':'+(i+1)+' original production host');
}}
function walk(path){const entries=readdirSync(path,{withFileTypes:true});for(const e of entries){const p=join(path,e.name);if(e.isDirectory())walk(p);else if(sourceExt.has(extname(p)))check(p)}}
for(const p of roots){if(p==='app'||p==='netlify'||p==='scripts')walk(p);else check(p)}
if(issues.length){console.error(issues.join('\n'));process.exitCode=1}else console.log('MatchXI isolation audit passed: no legacy production credentials, host references or storage keys in runtime source.');
