import {useState} from 'react';
import {calendarUsage,sumUsage,type UsagePoint} from './netlify-usage-model';
import './netlify-usage-panel.css';
const count=(n:number)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(n);
const bytes=(n:number)=>n>=1073741824?(n/1073741824).toFixed(2)+' GiB':n>=1048576?(n/1048576).toFixed(2)+' MiB':n>=1024?(n/1024).toFixed(1)+' KiB':count(n)+' B';
const localToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb'}).format(new Date());
const shortDay=(date:string,today:string)=>{if(date===today)return 'Today';const day=Number(date.slice(-2)),suffix=day%100>=11&&day%100<=13?'th':day%10===1?'st':day%10===2?'nd':day%10===3?'rd':'th';return new Date(date+'T12:00Z').toLocaleDateString('en-GB',{weekday:'short',timeZone:'UTC'})+' '+day+suffix;};
const monthName=(month:string)=>new Date(month+'-01T12:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric'});
type Candle={date:string;value:number|null;today:boolean;future:boolean};
export function UsageCandles({rows,selected,onSelect,format,monthly=false,label}:{rows:Candle[];selected:string;onSelect:(date:string)=>void;format:(n:number)=>string;monthly?:boolean;label:string}){
 const max=Math.max(1,...rows.map(p=>p.value||0)),chosen=rows.find(p=>p.date===selected);
 const describe=(p:Candle)=>p.future?'Upcoming':p.value===null?'No data':format(p.value);
 return <figure className="usage-candles"><figcaption><span>{monthly?'Months':monthName(rows[0].date.slice(0,7))}</span><span className="candle-readout" aria-live="polite">{chosen?(monthly?monthName(chosen.date.slice(0,7)):new Date(chosen.date+'T12:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short'}))+' · '+describe(chosen):'Select a bar'}</span></figcaption>
 <div className="candle-scale">{format(max)}</div><div className="candle-grid" role="group" aria-label={label} style={{gridTemplateColumns:`repeat(${rows.length},minmax(0,1fr))`}}>{rows.map((p,i)=><button key={p.date} type="button" aria-pressed={selected===p.date} aria-label={p.date+': '+describe(p)} aria-current={p.today?'date':undefined} tabIndex={selected===p.date?0:-1} data-today={p.today} data-empty={p.value===null} data-future={p.future} title={p.date+': '+describe(p)} onClick={()=>onSelect(p.date)} onKeyDown={e=>{const next=e.key==='ArrowRight'?Math.min(rows.length-1,i+1):e.key==='ArrowLeft'?Math.max(0,i-1):e.key==='Home'?0:e.key==='End'?rows.length-1:null;if(next!==null){e.preventDefault();onSelect(rows[next].date);(e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();}}}><span className="candle-bar" style={{height:p.value===null?'2px':Math.max(1,p.value/max*100)+'%'}}/></button>)}</div>
 <div className="candle-axis" aria-hidden="true" style={{gridTemplateColumns:`repeat(${rows.length},minmax(0,1fr))`}}>{rows.map((p,i)=><span key={p.date}>{monthly?new Date(p.date+'T12:00Z').toLocaleDateString('en-GB',{month:'short'}):i===0||i===rows.length-1||(i+1)%5===0?i+1:''}</span>)}</div></figure>;
}
function MetricCard({metric,data,month,today,mode,onMonth}:any){
 const format=metric==='functions'?count:bytes;
 const [day,setDay]=useState(today);
 const current=data.find((d:any)=>d.range.start.slice(0,7)===month);
 const points:UsagePoint[]=current?.[metric]?.points||[];
 const total=current?.[metric]?sumUsage(points,month+'-01',new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10)):null;
 const selected=day.startsWith(month)?day:month+'-01',year=today.slice(0,4);
 const selectedRows=points.filter(p=>p.date===selected);
 const rows: Candle[]=mode==='daily'?calendarUsage(points,month,today):Array.from({length:12},(_,i)=>{const m=year+'-'+String(i+1).padStart(2,'0'),d=data.find((r:any)=>r.range.start.startsWith(m));return {date:m+'-01',value:d?.[metric]?sumUsage(d[metric].points,d.range.start,d.range.end):null,today:m===today.slice(0,7),future:m>today.slice(0,7)};});
 return <article className="netlify-metric"><h3>{metric==='functions'?'Serverless functions':'Bandwidth'}</h3><dl className="usage-totals"><div aria-live="polite"><dt>{shortDay(selected,today)}</dt><dd>{selectedRows.length?format(selectedRows.reduce((n,p)=>n+p.value,0)):'—'}</dd></div><div><dt>Month <small>{monthName(month).split(' ')[0]}</small></dt><dd>{total!==null?format(total):'—'}</dd></div></dl><UsageCandles rows={rows} monthly={mode==='monthly'} selected={mode==='daily'?selected:month+'-01'} onSelect={date=>{if(mode==='monthly'){onMonth(date.slice(0,7));setDay(date);}else setDay(date);}} format={format} label={(metric==='functions'?'Function invocations':'Bandwidth')+' by '+(mode==='daily'?'day':'month')}/></article>;
}
export default function NetlifyUsagePanel({usage}:any){
 const today=localToday(),[mode,setMode]=useState<'daily'|'monthly'>('daily'),[month,setMonth]=useState(today.slice(0,7));
 if(!usage)return null;
 const results=usage.months||[],data=results.map((r:any)=>r.data).filter(Boolean),latest=data.find((d:any)=>d.range.start.startsWith(today.slice(0,7)))||data[data.length-1];
 const failures=results.some((r:any)=>r.failure||r.data?.failures?.length);
 return <section className="settings-card netlify-usage-panel"><header className="usage-heading"><div><h2>Netlify usage</h2><small>Team total · all projects</small></div><div className="netlify-chart-toggle" role="group" aria-label="Usage chart view">{(['daily','monthly'] as const).map(v=><button key={v} aria-pressed={mode===v} onClick={()=>setMode(v)}>{v==='daily'?'Daily':'Monthly'}</button>)}</div></header>
 <div className="netlify-metrics-grid">{['functions','bandwidth'].map(metric=><MetricCard key={metric} metric={metric} data={data} month={month} today={today} mode={mode} onMonth={setMonth}/>)}</div>
 <footer className="usage-footer"><span>Reported charges <strong>{latest?.charges?new Intl.NumberFormat('en-US',{style:'currency',currency:latest.charges.currency}).format(latest.charges.total):'—'}</strong></span><span>{latest?'Updated '+new Date(latest.checkedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}):'No data'}</span></footer>
 {failures&&<p className="netlify-source-warning" role="status">Some source data is unavailable. Showing saved values.</p>}
 </section>;
}
