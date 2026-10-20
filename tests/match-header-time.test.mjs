import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const result=await build({entryPoints:['app/match-header-time.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {matchHeaderTime,matchStatusLabel}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('header uses 24-hour kickoff with Today or a short date in the calendar timezone',()=>{
 const now=Date.parse('2026-10-20T10:00:00Z');
 assert.deepEqual(matchHeaderTime('2026-10-20T18:45:00Z',now,'Europe/Zagreb'),{time:'20:45',day:'Today'});
 assert.deepEqual(matchHeaderTime('2026-10-21T18:45:00Z',now,'Europe/Zagreb'),{time:'20:45',day:'Wed Oct 21'});
 assert.deepEqual(matchHeaderTime('2026-10-20T22:45:00Z',now,'Europe/Zagreb'),{time:'00:45',day:'Wed Oct 21'});
 assert.equal(matchHeaderTime('2026-10-26T19:45:00Z',now,'Europe/Zagreb').time,'20:45');
 assert.equal(matchHeaderTime('bad',now,'Europe/Zagreb').time,'TBC');
});

test('match status separates source kickoff strings from real state and preserves exceptions',()=>{
 assert.equal(matchStatusLabel({state:'pre',status:'10/20 - 3:00 PM EDT'}),'Not started');
 assert.equal(matchStatusLabel({state:'in',status:'23′'}),'Live');
 assert.equal(matchStatusLabel({state:'in',statusName:'STATUS_HALFTIME'}),'Half-time');
 assert.equal(matchStatusLabel({completed:true,state:'post',status:'FT'}),'Finished');
 for(const [status,label] of [['Postponed','Postponed'],['Cancelled','Cancelled'],['Suspended','Suspended'],['Abandoned','Abandoned'],['Delayed','Delayed']])assert.equal(matchStatusLabel({state:'pre',status}),label);
});
