import type {CSSProperties,ReactNode} from 'react';
import {House,Shield,Flag,Settings} from 'lucide-react';
import './glass-navigation.css';
type Choice={id:string;label:string;icon?:ReactNode;extra?:ReactNode};
export function GlassSwitch({items,value,onChange,label,className='',navigation=false}:{items:Choice[];value:string;onChange:(id:string)=>void;label:string;className?:string;navigation?:boolean}){
 const index=Math.max(0,items.findIndex(item=>item.id===value)),Tag=navigation?'nav':'div';
 return <Tag className={'glass-switch '+className} role={navigation?undefined:'group'} aria-label={label} style={{'--glass-count':items.length,'--glass-index':index} as CSSProperties}><span className="glass-selection" aria-hidden="true"/>{items.map(item=><button type="button" key={item.id} className={item.id===value?'glass-current':''} aria-current={navigation&&item.id===value?'page':undefined} aria-pressed={navigation?undefined:item.id===value} onClick={()=>onChange(item.id)}>{item.icon}<span>{item.label}</span>{item.extra}</button>)}</Tag>;
}
export default function AppFooter({value,onChange}:{value:string;onChange:(id:string)=>void}){
 const items=[{id:'home',label:'Home',icon:<House size={24}/>},{id:'clubs',label:'Clubs',icon:<Shield size={24}/>},{id:'national',label:'National teams',icon:<Flag size={24}/>},{id:'settings',label:'Settings',icon:<Settings size={24}/>}];
 return <footer className="app-bottom-dock"><GlassSwitch items={items} value={value} onChange={onChange} label="Main navigation" navigation className="footer-glass-switch"/></footer>;
}
