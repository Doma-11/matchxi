import './touchline-loader.css';

/** Presentation only: no timers, requests, artificial delay or progress claims. */
export default function TouchlineLoader({label='Loading',compact=false,fullPage=false}:{label?:string;compact?:boolean;fullPage?:boolean}){
 return <span className={'touchline-loader'+(compact?' touchline-compact':'')+(fullPage?' touchline-page':'')} role="status" aria-label={label}>
  <span className="touchline-pitch" aria-hidden="true"><span className="touchline-circle"/><span className="touchline-goal touchline-left"/><span className="touchline-goal touchline-right"/><span className="touchline-ball"/></span>
 </span>;
}
