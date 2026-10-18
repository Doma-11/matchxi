import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/match-clock.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {minuteClockText,sharedClockText,sharedMinuteClockText}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
test('Home hides seconds while preserving stoppage time and phase labels',()=>{
 for(const [clock,result] of [['57:34',"57'"],['19:00',"19'"],['45+0:37',"45'"],['90+3:59',"90+3'"],['HT','HT'],['Suspended','Suspended']])assert.equal(minuteClockText(clock),result);
});
test('Home and open match display the same shared anchor in different formats',()=>{
 const now=Date.parse('2026-10-18T19:00Z'),game={league:'eng.1',id:'minute-display',state:'in',period:2,clock:'57:34',clockCheckedAt:new Date(now).toISOString()};
 assert.equal(sharedMinuteClockText(game,now),"57'");assert.equal(sharedClockText(game,now),'57:34');assert.equal(sharedMinuteClockText(game,now+27000),"58'");assert.equal(sharedClockText(game,now+27000),'58:01');
});
