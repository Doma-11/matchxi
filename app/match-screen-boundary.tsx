import BackButton from './back-button';
import {Component,type ReactNode} from 'react';
export default class MatchScreenBoundary extends Component<{children:ReactNode;onBack:()=>void},{failed:boolean;retry:number}>{
 state={failed:false,retry:0};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:Error){console.error('Match screen failed:',error.message)}
 render(){return this.state.failed?<section className="match-unavailable" role="alert"><h2>This match could not open</h2><p>Please try again or return to matches.</p><BackButton onClick={this.props.onBack} label="Back to matches"/><button className="icon-button" onClick={()=>this.setState(s=>({failed:false,retry:s.retry+1}))}>Try again</button></section>:<div key={this.state.retry} style={{display:'contents'}}>{this.props.children}</div>}
}
