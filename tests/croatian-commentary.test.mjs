import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';
const c=await build({entryPoints:['app/croatian-commentary.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {croatianCommentaryDestination}=await import('data:text/javascript;base64,'+Buffer.from(c.outputFiles[0].text).toString('base64'));
const game={league:'cro.1',date:'2026-10-18T16:00Z',home:{name:'Slaven Belupo'},away:{name:'Dinamo Zagreb'},state:'in',completed:false};
test('verified public HR listing is scoped to this fixture and Zagreb date',()=>{
 const result=croatianCommentaryDestination(game);assert.equal(result.kind,'match-page');assert.equal(result.url,'https://bhliga.com/match/4732302');assert.equal(result.sourceUrl,'https://bhliga.com/match/4732302');
 assert.equal(croatianCommentaryDestination({...game,home:{name:'Slaven'},away:{name:'Dinamo'}}).kind,'match-page');
 for(const other of [{date:'2026-10-19T16:00Z'},{league:'uefa.champions'},{home:game.away,away:game.home},{away:{name:'Hajduk'}}])assert.equal(croatianCommentaryDestination({...game,...other}).kind,'listings');
 assert.equal(croatianCommentaryDestination({...game,date:'2026-10-17T23:30Z'}).kind,'match-page');
});
test('every other live match receives public listings without inventing a player URL',()=>{
 assert.deepEqual(croatianCommentaryDestination({...game,league:'eng.1',home:{name:'Arsenal'},away:{name:'Liverpool'}}),{kind:'listings',url:'https://bhliga.com/',sourceUrl:'https://bhliga.com/',channel:null});
 assert.equal(croatianCommentaryDestination({...game,state:'pre'}),null);assert.equal(croatianCommentaryDestination({...game,state:'post',completed:true}),null);
});
test('match-page links reject unsafe destinations and do not depend on player access',()=>{
 const base={league:'cro.1',date:'2026-10-18',home:'Slaven Belupo',away:'Dinamo Zagreb',country:'HR',channel:'MAXSport 1',url:'https://sport-panel247.store/player/HR/4339',sourceUrl:'https://bhliga.com/match/4732302',listingCheckedOn:'2026-10-18'};
 for(const bad of [{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://bhliga.com.evil.example/match/4732302'},{sourceUrl:'https://user:pass@bhliga.com/match/4732302'},{sourceUrl:'https://bhliga.com/match/4732302?redirect=evil'},{sourceUrl:'https://evil.example/match/4732302'},{country:'RS'}])assert.equal(croatianCommentaryDestination(game,[{...base,...bad}]).kind,'listings');
 assert.equal(croatianCommentaryDestination(game,[{...base,url:'invalid-player'}]).url,base.sourceUrl);
});
