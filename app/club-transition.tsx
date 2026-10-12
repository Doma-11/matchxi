import {useEffect} from 'react';
import type {CSSProperties} from 'react';
export default function ClubTransition({club,origin,onNavigate,onDone}:any){
 useEffect(()=>{const navigate=setTimeout(onNavigate,207),done=setTimeout(onDone,380);return()=>{clearTimeout(navigate);clearTimeout(done)}},[]);
 const size=origin?.size||64,x=origin?.x??(window.innerWidth-size)/2,y=origin?.y??(window.innerHeight-size)/2;
 const style={'--crest-x':`${x}px`,'--crest-y':`${y}px`,'--crest-size':`${size}px`,'--crest-grow':Math.max(window.innerWidth,window.innerHeight)*1.2/size,'--transition-color':club.color?`#${club.color.replace(/^#/,'')}`:'#667d91'} as CSSProperties;
 const sparks=Array.from({length:24},(_,i)=>{const angle=i*Math.PI*2/24,radius=Math.min(window.innerWidth,window.innerHeight)*(.3+(i%4)*.07);return {'--spark-x':`${Math.cos(angle)*radius}px`,'--spark-y':`${Math.sin(angle)*radius}px`,'--spark-angle':`${angle*180/Math.PI+90}deg`,'--spark-delay':`${68+(i%5)*8}ms`,'--spark-color':i%2?'color-mix(in srgb,var(--transition-color) 65%,white)':'var(--transition-color)'} as CSSProperties});
 return <div className="club-transition" style={style} aria-hidden="true"><div className="club-transition-glow"/>{club.logo?<img src={club.logo} alt=""/>:<span className="club-transition-fallback">{club.short||club.name.slice(0,2)}</span>}<div className="club-sparks">{sparks.map((s,i)=><i key={i} style={s}/>)}</div></div>;
}
