import {useState} from 'react';
import {sumUsage,type UsagePoint} from './netlify-usage-model';
import './netlify-usage-panel.css';
const count=(n:number)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:0}).format(n);
const bytes=(n:number)=>n>=1073741824?(n/1073741824).toFixed(2)+' GiB':n>=1048576?(n/1048576).toFixed(2)+' MiB':count(n)+' B';
function Chart({points,label,format}:{points:UsagePoint[];label:string;format:(n:number)=>string}){
 if(!points.length)return <p>No published usage buckets for this range.</p>;
 const max=Math.max(1,...points.map(p=>p.value)),step=600/points.length,width=Math.max(2,step*.66);
 return <figure className="netlify-chart"><svg viewBox="0 0 640 170" role="img" aria-label={label}>
  <line x1="20" x2="620" y1="135" y2="135" stroke="currentColor" opacity=".25"/>
  {points.map((p,i)=>{const h=p.value/max*105,x=20+i*step+(step-width)/2;return <g key={p.at} tabIndex={0} aria-label={p.date+': '+format(p.value)}><title>{p.date+': '+format(p.value)}</title><rect x={x} y={135-Math.max(h,1)} width={width} height={Math.max(h,1)} rx={Math.min(3,width/2)}/>{(points.length<9||i===0||i===points.length-1||i%7===0)&&<text x={x+width/2} y="157" textAnchor="middle">{p.date.slice(5)}</text>}</g>})}
  <text x="20" y="15">{format(max)}</text>
 </svg><details><summary>Show exact values</summary><div className="netlify-values"><table><caption>{label}</caption><thead><tr><th>Date / month</th><th>Usage</th></tr></thead><tbody>{points.map(p=><tr key={p.at}><th scope="row">{p.date}</th><td>{format(p.value)}</td></tr>)}</tbody></table></div></details></figure>;
}
export default function NetlifyUsagePanel({usage}:any){
 const [mode,setMode]=useState<'daily'|'monthly'>('daily');
 if(!usage)return null;
 const results=usage.months||[],data=results.map((r:any)=>r.data).filter(Boolean),latest=data[data.length-1],rangeEnd=usage.end;
 const failures=[...new Set(results.flatMap((r:any)=>[r.failure,...(r.data?.failures||[])].filter(Boolean)))];
 const selectedDay=new Date(Date.parse(rangeEnd+'T12:00Z')-86400000).toISOString().slice(0,10);
 return <section className="settings-card netlify-usage-panel" aria-labelledby="netlify-usage-title"><div className="settings-card-heading"><span className="kicker">OFFICIAL NETLIFY DATA</span><h2 id="netlify-usage-title">Hosting usage & spending</h2><p><strong>Entire hosting team</strong>{latest?' · '+latest.team:''}. Includes your other projects; not Touchline alone.</p></div>
  <div className="netlify-chart-toggle" role="group" aria-label="Usage chart view">{(['daily','monthly'] as const).map(v=><button key={v} aria-pressed={mode===v} onClick={()=>setMode(v)}>{v==='daily'?'Daily usage':'Monthly usage'}</button>)}</div>
  <div className="netlify-metrics-grid">{(['functions','bandwidth'] as const).map(metric=>{
   const format=metric==='functions'?count:bytes;
   const all:UsagePoint[]=data.flatMap((d:any)=>d[metric]?.points||[]),points=all.filter(p=>p.date>=usage.start&&p.date<rangeEnd);
   const monthRows:UsagePoint[]=data.filter((d:any)=>d[metric]).map((d:any)=>({date:d.range.start.slice(0,7),at:d.range.start,value:sumUsage(d[metric].points,d.range.start,d.range.end)}));
   const current=latest?.[metric],monthTotal=current?sumUsage(current.points,latest.range.start,latest.range.end):null;
   const daily=all.find(p=>p.date===selectedDay);
   return <article className="netlify-metric" key={metric}><h3>{metric==='functions'?'Serverless functions':'Bandwidth'}</h3><dl><div><dt>Selected period · {usage.start}–{selectedDay}</dt><dd>{all.length?format(sumUsage(all,usage.start,rangeEnd)):'Unavailable'}</dd></div><div><dt>{selectedDay} · published day</dt><dd>{daily?format(daily.value):'No bucket published'}</dd></div><div><dt>{latest?.range.start.slice(0,7)||'Month'} · published monthly total</dt><dd>{monthTotal!==null?format(monthTotal):'Unavailable'}</dd></div></dl><Chart points={mode==='daily'?points:monthRows} label={(metric==='functions'?'Function invocations':'Bandwidth')+' · '+mode+' published usage'} format={format}/>{current?.checkedAt&&<p className="report-timestamp">Metric checked {new Date(current.checkedAt).toLocaleString('en-GB',{hourCycle:'h23'})}</p>}</article>;
  })}</div>
  {latest?.functions?.limit&&<p className="netlify-allowance"><strong>Monthly function allowance:</strong> {count(latest.functions.limit)} invocations for the whole team. Charts show published calendar buckets, not a guaranteed remaining quota.</p>}
  {latest?.billingBandwidth&&<p className="netlify-allowance"><strong>Current bandwidth allowance:</strong> {bytes(latest.billingBandwidth.used)} / {bytes(latest.billingBandwidth.included)} · billing period {latest.billingBandwidth.start?.slice(0,10)}–{latest.billingBandwidth.end?.slice(0,10)}. This billing counter can differ from the calendar-day chart.</p>}
  {latest?.charges?<p className="netlify-spending"><strong>{latest.charges.total===0?'✓':'✕'} Current reported subscription charges: {new Intl.NumberFormat('en-US',{style:'currency',currency:latest.charges.currency}).format(latest.charges.total)}</strong> · {latest.charges.plan}<small>{latest.charges.scope} This is a current snapshot, not spending attributed to the selected report dates.</small></p>:<p className="netlify-source-warning">Subscription charges are unavailable; no cost estimate is shown.</p>}
  {failures.length>0&&<p className="netlify-source-warning" role="status">✕ {failures.join(' · ')} Saved figures, if shown, retain their original timestamps.</p>}
  <p className="report-timestamp">{latest?'Source checked '+new Date(latest.checkedAt).toLocaleString('en-GB',{hourCycle:'h23'}):'Official usage is not available yet.'}</p><details className="report-method"><summary>Measurement & reporting boundaries</summary><p>These charts use Netlify’s published daily buckets, which may differ from Zagreb calendar days. Missing buckets are not filled with invented zeros. Current-day figures and recent usage may be delayed. Monthly bars sum the published buckets for each calendar month shown. Data is cached for 12 hours; viewing reports does not poll continuously.</p></details>
 </section>;
}
