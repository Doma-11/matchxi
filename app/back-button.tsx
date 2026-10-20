import {ArrowLeft} from 'lucide-react';
import './navigation-interactions.css';
export default function BackButton({onClick,label='Back'}:{onClick:()=>void;label?:string}){
 return <button type="button" className="back-link compact-back" onClick={onClick} aria-label={label} title={label}><ArrowLeft size={21} aria-hidden="true"/></button>;
}
