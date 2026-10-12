import {roundStatNumber} from './stat-number';
export function normalizeMatchPoll(raw:any){
 const votes=raw?.Votes?.find((v:any)=>v.Name==='1x2')?.Votes;
 const counts=Array.isArray(votes)&&votes.length===3?votes:[raw?.home,raw?.draw,raw?.away];
 if(!counts.every(n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0))return null;
 const total=counts.reduce((a,b)=>a+b,0);if(total<=0)return null;
 return {home:roundStatNumber(counts[0]/total*100),draw:roundStatNumber(counts[1]/total*100),away:roundStatNumber(counts[2]/total*100),totalVotes:total,source:'FotMob',checkedAt:new Date().toISOString()};
}
