import {normalize,clubTerms} from './team-identity';
export {normalize,clubTerms} from './team-identity';
export type Club={id:string;name:string;short?:string;logo?:string;color?:string;league:string};
export const LEAGUES=[
{id:'eng.1',name:'Premier League',country:'England',logo:'/logos/premier-league.svg',brand:'#37003c',accent:'#00ff87',secondary:'#ff2882',surface:'#250028',soft:'#19051d',top:['Arsenal','Liverpool','Manchester City','Manchester United','Chelsea'],url:'https://www.premierleague.com/en/'},
{id:'esp.1',name:'LALIGA',country:'Spain',logo:'/logos/laliga.svg',brand:'#ff4b44',accent:'#ff6e66',secondary:'#f5f709',surface:'#331310',soft:'#1d0808',top:['Real Madrid','Barcelona','Atlético Madrid','Athletic Club'],url:'https://www.laliga.com/en-GB'},
{id:'ita.1',name:'Serie A',country:'Italy',logo:'/logos/serie-a.svg',brand:'#02235c',accent:'#00e8da',secondary:'#0d8efe',surface:'#072c55',soft:'#03162c',top:['Internazionale','AC Milan','Juventus','AS Roma','Napoli'],url:'https://en.legaseriea.it/'},
{id:'ger.1',name:'Bundesliga',country:'Germany',logo:'/logos/bundesliga.svg',brand:'#d20515',accent:'#ff3449',secondary:'#ffffff',surface:'#36080d',soft:'#1c0609',top:['Bayern Munich','Borussia Dortmund','Bayer Leverkusen','RB Leipzig'],url:'https://www.bundesliga.com/en/bundesliga'},
{id:'cro.1',name:'SuperSport HNL',country:'Croatia',logo:'/logos/hnl.png',brand:'#e0007b',accent:'#ff2b9d',secondary:'#ffffff',surface:'#25121f',soft:'#120b10',top:['Dinamo','Hajduk','Rijeka','Osijek'],url:'https://www.hnl.hr/'}];
export const COMPETITIONS=[
{id:'uefa.nations',logo:'/logos/nations-league.svg',motif:'nations',name:'UEFA Nations League',edition:'2026/27',status:'League phase',brand:'#2d3750',accent:'#fdc301',secondary:'#3fa3dc',surface:'#242e46',soft:'#1b212f',url:'https://www.uefa.com/uefanationsleague/'},
{id:'fifa.world',logo:'/logos/world-cup-2026.svg',motif:'world',name:'FIFA World Cup',edition:'2026',status:'Tournament highlights',brand:'#111111',accent:'#dfb765',secondary:'#ffffff',surface:'#24211b',soft:'#111110',url:'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026'},
{id:'uefa.euro',logo:'/logos/euro-2024.svg',motif:'euro',name:'UEFA EURO',edition:'2024 archive',status:'Next tournament: 2028',brand:'#001ec8',accent:'#009bff',secondary:'#00c878',surface:'#122951',soft:'#08182e',url:'https://www.uefa.com/uefaeuro/'}];
export function mentionsClub(video:any,club:{name:string;short?:string}){const text=' '+normalize(video.title||'')+' ',publisher=normalize(video.publisher||'');return clubTerms(club).some(term=>term&&(text.includes(' '+term+' ')||publisher===term));}
export function matchVideo(video:any,game:any){
 if(!mentionsClub(video,game.home)||!mentionsClub(video,game.away))return false;
 if(!game.completed)return true;
 const home=Number(game.home.score),away=Number(game.away.score);
 if(game.home.score==null||game.away.score==null||!Number.isFinite(home)||!Number.isFinite(away))return true;
 const scores=[...(video.title||'').matchAll(/\b(\d{1,2})\s*[-:–]\s*(\d{1,2})\b/g)].filter(m=>Number(m[1])<=15&&Number(m[2])<=15);
 if(!scores.length)return true;
 const text=' '+normalize(video.title||'')+' ';
 const position=(team:any)=>Math.min(...clubTerms(team).map(t=>text.indexOf(' '+t+' ')).filter(n=>n>=0));
 const reverse=position(game.away)<position(game.home);
 return scores.some(m=>Number(m[1])===(reverse?away:home)&&Number(m[2])===(reverse?home:away));
}
export function normalizeMatch(event:any,league:string){const c=event.competitions?.[0];if(!c)return null;const h=c.competitors?.find((t:any)=>t.homeAway==='home'),a=c.competitors?.find((t:any)=>t.homeAway==='away');if(!h||!a)return null;const team=(x:any)=>({id:String(x.team.id),name:x.team.displayName,short:x.team.abbreviation,logo:x.team.logo||x.team.logos?.[0]?.href,score:typeof x.score==='object'?x.score.displayValue:x.score??null});const status=c.status||event.status;return {id:String(event.id),league,date:event.date,home:team(h),away:team(a),completed:!!status?.type?.completed,state:status?.type?.state||'pre',status:status?.type?.shortDetail||'Scheduled',statusName:status?.type?.name,statusDescription:status?.type?.description,venue:c.venue?.fullName||c.venue?.name||null,city:c.venue?.address?.city||null,attendance:c.attendance||null,round:event.week?.text||c.groups?.shortName||null};}

export function videoMatchDate(video:any){const m=video.title?.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\.?/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null;}
export function belongsToCompetition(video:any,league:string,games:any[]){if(video.league===league)return true;if(video.league!=='hr.media')return false;const date=videoMatchDate(video),published=Date.parse(video.publishedAt||'');return games.some(g=>g.league===league&&matchVideo(video,g)&&(date?g.date.slice(0,10)===date:Number.isFinite(published)&&published>=Date.parse(g.date)&&published<=Date.parse(g.date)+86400000&&(/lig[auie] nacij[ae]|nations league/i.test(video.title)?league==='uefa.nations':false)));}

export const CLUB_CUPS=[{id:'uefa.champions',name:'Champions League',country:'Europe',logo:'/logos/champions-league.svg',brand:'#00004b',accent:'#5af7dc',secondary:'#ff16ff',surface:'#010141',soft:'#080e22'},{id:'uefa.europa',name:'Europa League',country:'Europe',logo:'/logos/europa-league.svg',brand:'#000000',accent:'#ff6900',secondary:'#ffd400',surface:'#23180f',soft:'#12100e'},{id:'uefa.europa.conf',name:'Conference League',country:'Europe',logo:'/logos/conference-league.svg',brand:'#005809',accent:'#00be14',secondary:'#ffd400',surface:'#101f14',soft:'#0b120d'}];
export function isNationalCompetition(id:string){return ['uefa.nations','fifa.world','uefa.euro','fifa.worldq.uefa','fifa.friendly'].includes(id)}
