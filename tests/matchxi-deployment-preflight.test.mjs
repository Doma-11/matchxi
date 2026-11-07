import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const valid={
 MATCHXI_NETLIFY_SITE_ID:'7b761624-8fec-4cca-b485-89684fa3f6b4',
 MATCHXI_SITE_URL:'https://matchxi.netlify.app',
 MATCHXI_REFRESH_SECRET:'offline-test-only-'.repeat(4),
 MATCHXI_ENABLE_SCHEDULES:'false'
};
function preflight(overrides={}){
 const inherited=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('MATCHXI_')&&!key.startsWith('TOUCHLINE_')));
 return spawnSync(process.execPath,['scripts/check-matchxi-deployment-config.mjs'],{
  env:{...inherited,...valid,...overrides},encoding:'utf8'
 });
}
test('deployment preflight accepts independent MatchXI configuration',()=>{
 assert.equal(preflight().status,0);
});
test('deployment preflight rejects the actual original production site ID',()=>{
 const r=preflight({MATCHXI_NETLIFY_SITE_ID:'50f08265-7afe-4542-ad4f-d8a92823d202'});
 assert.equal(r.status,1);assert.match(r.stderr,/Original Touchline site ID is forbidden/);
});
test('deployment preflight rejects the actual original production hostname',()=>{
 const r=preflight({MATCHXI_SITE_URL:'https://touchline-football-hub.netlify.app'});
 assert.equal(r.status,1);assert.match(r.stderr,/independent HTTPS origin/);
});
test('deployment preflight rejects enabled schedules and missing credentials',()=>{
 assert.equal(preflight({MATCHXI_ENABLE_SCHEDULES:'true'}).status,1);
 assert.equal(preflight({MATCHXI_REFRESH_SECRET:''}).status,1);
 assert.equal(preflight({MATCHXI_NETLIFY_SITE_ID:''}).status,1);
});
test('deployment preflight rejects credential-bearing and insecure URLs',()=>{
 for(const url of ['http://matchxi.netlify.app','https://user:password@matchxi.netlify.app','https://matchxi.netlify.app/path']){
  assert.equal(preflight({MATCHXI_SITE_URL:url}).status,1);
 }
});
