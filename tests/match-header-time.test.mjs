import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const result=await build({entryPoints:['app/match-header-time.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {matchHeaderTime}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('header uses 24-hour kickoff with Today or a short date in the calendar timezone',()=>{
 const now=Date.parse('2026-10-20T10:00:00Z');
 assert.deepEqual(matchHeaderTime('2026-10-20T18:45:00Z',now,'Europe/Zagreb'),{time:'20:45',day:'Today'});
 assert.deepEqual(matchHeaderTime('2026-10-21T18:45:00Z',now,'Europe/Zagreb'),{time:'20:45',day:'Wed Oct 21'});
 assert.deepEqual(matchHeaderTime('2026-10-20T22:45:00Z',now,'Europe/Zagreb'),{time:'00:45',day:'Wed Oct 21'});
 assert.equal(matchHeaderTime('2026-10-26T19:45:00Z',now,'Europe/Zagreb').time,'20:45');
 assert.equal(matchHeaderTime('bad',now,'Europe/Zagreb').time,'TBC');
});
