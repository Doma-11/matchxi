import NetlifyUsagePanel from './netlify-usage-panel';
import {useReportAccess} from './account-access';
'use client';
import InstallApp from './install-app';
import {AccountSettings} from './private-login';
import DailyReport from './daily-report';
import {desktopMode,setDisplayMode} from './display-mode';
import {projectorMode,setProjectorMode} from './projector-mode';
import {useEffect,useState} from 'react';
import {Sun,Moon,CheckCircle2,RefreshCw,Palette,CalendarDays,BarChart3} from 'lucide-react';
export default function AppSettings(){
 const canReport=useReportAccess();
 const [projector,setProjector]=useState(projectorMode);
 const [desktop,setDesktop]=useState(desktopMode),[tab,setTab]=useState('appearance'),[light,setLight]=useState(()=>{try{return localStorage.getItem('touchline-theme')==='light'}catch{return false}}),[period,setPeriod]=useState('weekly'),[archive,setArchive]=useState(''),[report,setReport]=useState<any>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 function change(value:boolean){setLight(value);document.documentElement.dataset.theme=value?'light':'dark';try{localStorage.setItem('touchline-theme',value?'light':'dark')}catch{}}
 useEffect(()=>{if(!canReport||tab!=='reports')return;const abort=new AbortController();setLoading(true);setError('');setReport(null);fetch('/api/usage-reports?period='+period+(archive?'&start='+archive:''),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(r=>{if(!abort.signal.aborted)setReport(r)}).catch(e=>{if(e.name!=='AbortError')setError('Report unavailable. Try again later.')}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return()=>abort.abort()},[canReport,tab,period,archive]);
 const tabs=[{id:'appearance',name:'Appearance',icon:Palette},{id:'daily',name:'Daily report',icon:CalendarDays},{id:'reports',name:'Reports',icon:BarChart3}].filter(t=>canReport||t.id==='appearance');
 return <section className="settings-page"><header className="settings-heading"><span className="kicker">YOUR TOUCHLINE</span><h1>Settings</h1><p>Your look, match updates and usage in one place.</p></header><div className="settings-tabs settings-main-tabs" role="tablist" aria-label="Settings sections">{tabs.map(({id,name,icon:Icon})=><button id={'settings-tab-'+id} aria-controls={'settings-panel-'+id} role="tab" aria-selected={tab===id} key={id} onClick={()=>setTab(id)}><Icon size={17}/><span>{name}</span></button>)}</div>
 <div role="tabpanel" id={'settings-panel-'+tab} aria-labelledby={'settings-tab-'+tab}>
 {canReport&&tab==='daily'?<DailyReport/>:tab==='appearance'?<><section className="settings-card"><div className="settings-card-heading"><h2>Make it yours</h2><p>Choose a theme. Saved on this device.</p></div><div className="theme-options">{[{value:false,name:'Dark',description:'Our signature night view',Icon:Moon},{value:true,name:'Light',description:'A fresh, brighter view',Icon:Sun}].map(({value,name,description,Icon})=><button className={'theme-option '+(value?'theme-preview-light':'theme-preview-dark')} aria-pressed={light===value} key={name} onClick={()=>change(value)}><div className="theme-preview"><i/><i/><i/></div><span><Icon size={18}/><strong>{name}</strong>{light===value&&<CheckCircle2 size={17}/>}</span><small>{description}</small></button>)}</div><div className="desktop-mode-setting"><div><h3>Desktop mode</h3><p>Off uses the responsive layout for your screen.</p></div><button role="switch" aria-checked={desktop} aria-label="Desktop mode" onClick={()=>{setDesktop(!desktop);setDisplayMode(!desktop)}}><span/>{desktop?'On':'Off'}</button></div><div className="desktop-mode-setting"><div><h3>Projector mode</h3><p>Larger broadcast controls and clear keyboard selection.</p></div><button role="switch" aria-checked={projector} aria-label="Projector mode" onClick={()=>{setProjector(!projector);setProjectorMode(!projector)}}><span/>{projector?'On':'Off'}</button></div></section><InstallApp/><AccountSettings/></>:<><div className="usage-report-controls"><div className="settings-tabs report-period" role="group" aria-label="Report period">{['weekly','monthly'].map(p=><button aria-pressed={period===p} key={p} onClick={()=>{setArchive('');setPeriod(p)}}>{p==='weekly'?'Weekly':'Monthly'}</button>)}</div>{report&&<label className="report-archive"><span>Period</span><select value={archive} onChange={e=>setArchive(e.target.value)}><option value="">Latest</option>{report.history?.map((d:string)=><option key={d} value={d}>{d}</option>)}</select></label>}</div>
 {loading?<div className="settings-card settings-loading" role="status"><RefreshCw className="spin" size={18}/>Loading your report…</div>:error?<p role="alert" className="settings-card">{error}</p>:report&&<><NetlifyUsagePanel usage={report.netlifyUsage}/></>}

 </>}
 </div></section>
}
