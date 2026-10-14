import {build} from 'esbuild';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const compiled=await build({entryPoints:['app/team-identity.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {resolveTeamIdentity,sameTeamIdentity}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('every saved domestic and European competition team resolves to an identity',()=>{
 for(const [league,teams] of Object.entries(read('public/data/clubs.json'))){
  for(const team of teams)assert.ok(resolveTeamIdentity(team.name,{league,kind:'club'}),team.name);
 }
 for(const [league,dashboard] of Object.entries(read('public/data/league-dashboards.json'))){
  for(const row of dashboard.table)assert.ok(resolveTeamIdentity(row.name,{league,kind:'club'}),row.name);
 }
 for(const [league,teams] of Object.entries(read('public/data/national-teams.json'))){
  for(const team of teams)assert.ok(resolveTeamIdentity(team.name,{league,kind:'national'}),team.name);
 }
});
test('full names, source aliases, accents and club designators share IDs',()=>{
 for(const [a,b] of [['Internazionale','Inter Milan'],['Viking FK','Viking'],['Sabah FK','Sabah'],['Slavia Prague','SK Slavia Praha'],['PSV Eindhoven','PSV'],['Bayern Munich','Bayern München'],['FC Cologne','1. FC Köln'],['Deportivo','Deportivo A Coruña'],['Union St.Gilloise','Union Saint-Gilloise'],['FK Crvena Zvezda','Red Star Belgrade'],['Heart of Midlothian','Hearts'],['Dinamo','GNK Dinamo'],['Croatia','Hrvatska']]){
  assert.equal(resolveTeamIdentity(a)?.id,resolveTeamIdentity(b)?.id,`${a} / ${b}`);assert.ok(resolveTeamIdentity(a));
 }
 assert.equal(sameTeamIdentity('  pSv  ','PSV Eindhoven'),true);
});
test('ambiguous codes fail closed unless competition membership disambiguates them',()=>{
 assert.equal(resolveTeamIdentity('INT',{kind:'club'}),null);
 assert.equal(sameTeamIdentity('INT','Internazionale',{kind:'club'}),false);
 assert.equal(sameTeamIdentity('INT','Internazionale',{league:'ita.1',kind:'club'}),true);
 assert.equal(sameTeamIdentity('INT','Inter Club d\'Escaldes',{league:'uefa.europa.conf',kind:'club'}),true);
 assert.equal(sameTeamIdentity('PSV','Jong PSV'),false);
 assert.equal(sameTeamIdentity('Viking','Vikingur Reykjavik'),false);
 assert.equal(sameTeamIdentity('Manchester United','Manchester City'),false);
 assert.equal(sameTeamIdentity('Arsenal','Arsenal Women'),false);
 assert.equal(sameTeamIdentity('Town','Ipswich Town'),false);
});
test('future unknown clubs match only identical normalized names',()=>{
 assert.equal(sameTeamIdentity('Future FC','FUTURE FC'),true);
 assert.equal(sameTeamIdentity('Future','Future FC'),false);
 assert.equal(sameTeamIdentity('',''),false);
});

test('audited official fixture-provider names retain their expected shared IDs',()=>{
 const audit=read('tests/fixtures/team-provider-names.json');
 for(const team of audit.teams){
  const kind=['uefa.nations','fifa.world','uefa.euro'].includes(team.league)?'national':'club';
  for(const name of team.names)assert.equal(resolveTeamIdentity(name,{league:team.league,kind})?.id,team.identityId,`${team.league}: ${name}`);
 }
 assert.equal(sameTeamIdentity('Feyenoord Rotterdam','Feyenoord',{league:'uefa.champions',kind:'club'}),true);
 assert.equal(sameTeamIdentity('CSU Craiova','FC U Craiova 1948',{kind:'club'}),false);
 assert.equal(sameTeamIdentity("Inter D'Escaldes",'Internazionale',{kind:'club'}),false);
});
