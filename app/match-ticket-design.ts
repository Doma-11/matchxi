import {useEffect,useState} from 'react';
export type TicketDesign='current'|'matchday';
export const TICKET_DESIGN_KEY='matchxi-ticket-design-v1';
export const TICKET_DESIGN_EVENT='matchxi-ticket-design-changed';
export function readTicketDesign():TicketDesign{return window.localStorage.getItem(TICKET_DESIGN_KEY)==='matchday'?'matchday':'current'}
export function saveTicketDesign(value:TicketDesign){if(value!=='current'&&value!=='matchday')throw Error('Unknown ticket design.');window.localStorage.setItem(TICKET_DESIGN_KEY,value);window.dispatchEvent(new Event(TICKET_DESIGN_EVENT));}
export function useTicketDesign(){
 const [design,setDesign]=useState<TicketDesign>('current'),[error,setError]=useState('');
 useEffect(()=>{const refresh=()=>{try{setDesign(readTicketDesign());setError('')}catch{setError('Your ticket design preference could not be read on this device.')}};const changed=(e:StorageEvent)=>{if(e.key===TICKET_DESIGN_KEY||e.key===null)refresh()};refresh();window.addEventListener(TICKET_DESIGN_EVENT,refresh);window.addEventListener('storage',changed);return()=>{window.removeEventListener(TICKET_DESIGN_EVENT,refresh);window.removeEventListener('storage',changed)}},[]);
 const choose=(value:TicketDesign)=>{try{saveTicketDesign(value);setDesign(value);setError('')}catch{setError('Your design could not be saved. Check storage space and try again.')}};
 return {design,error,choose};
}
