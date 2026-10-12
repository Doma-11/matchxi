'use client';
import {useState} from 'react';
import {matchVideo,videoMatchDate} from './football-model';
const compilation=/\bbest\b|\btop\s*\d+\b|goals? of (?:the )?(?:week|month|season|matchday)|saves? of (?:the )?|all (?:the )?goals|compilation|round.?up|najbolj|najlep|najljep|mejores|migliori/i;
export function videoRound(video:any,fixtures:any[]=[]){
 if(compilation.test(video.title))return 'other';
 const title=video.title||'';
 const explicit=title.match(/(?:match\s*day|game\s*week|week|round|jornada|journée|spieltag|giornata|kolo|\bMD|\bGW)\s*[#:.\-]?\s*(\d{1,2})\b/i)||title.match(/\b(\d{1,2})\s*\.?\s*(?:kolo|giornata|spieltag)\b/i);
 if(explicit)return 'round-'+Number(explicit[1]);
 const date=videoMatchDate(video);const matches=fixtures.filter(g=>g.league===video.league&&matchVideo(video,g)&&(!date||g.date?.slice(0,10)===date));
 const rounds=new Set(matches.map(g=>String(g.round||'').match(/(?:matchday|week|round|kolo|jornada|giornata|spieltag)?\s*(\d{1,2})\b/i)?.[1]).filter(Boolean));
 // Without a precise video date, only an unambiguous fixture can establish its round.
 if(rounds.size===1&&(date||matches.length===1))return 'round-'+Number([...rounds][0]);
 return /highlight|sažet|sazet|resumen|résumé|resume|\bvs?\.?\b/i.test(title)?'unassigned':'other';
}
export default function HighlightGroups({videos,fixtures=[],renderVideo}:any){
 const [category,setCategory]=useState('all');const grouped=new Map<string,any[]>();
 for(const video of videos){const key=videoRound(video,fixtures);grouped.set(key,[...(grouped.get(key)||[]),video])}
 const keys=[...grouped.keys()].sort((a,b)=>a.startsWith('round-')&&b.startsWith('round-')?Number(b.slice(6))-Number(a.slice(6)):a.startsWith('round-')?-1:b.startsWith('round-')?1:a==='other'?1:-1);
 const label=(key:string)=>key==='other'?'Other videos':key==='unassigned'?'Match highlights':`Matchday / Week ${key.slice(6)}`;
 const active=category==='all'||grouped.has(category)?category:'all';
 if(!videos.length)return null;
 return <div className="highlight-categories"><div className="highlight-category-picker" role="group" aria-label="Highlight categories">{['all',...keys].map(key=><button key={key} aria-pressed={active===key} onClick={()=>setCategory(key)}>{key==='all'?'All videos':label(key)}<small>{key==='all'?videos.length:grouped.get(key)?.length}</small></button>)}</div>{keys.filter(key=>active==='all'||active===key).map(key=><section className="highlight-category-section" key={key}><div className="section-heading"><div><h3>{label(key)}</h3>{key==='other'&&<p>Best goals, saves, compilations and more.</p>}{key==='unassigned'&&<p>Matchday not published or not yet confirmed.</p>}</div><span className="subtle">{grouped.get(key)?.length} videos</span></div><div className="video-grid">{grouped.get(key)?.map(renderVideo)}</div></section>)}</div>
}
