const key='matchxi-projector-mode';
export function projectorMode(){try{return localStorage.getItem(key)==='on';}catch{return false;}}
export function setProjectorMode(enabled:boolean){try{localStorage.setItem(key,enabled?'on':'off');}catch{}if(typeof document!=='undefined')document.documentElement.dataset.projector=enabled?'on':'off';}
export function initializeProjectorMode(){if(typeof document!=='undefined')document.documentElement.dataset.projector=projectorMode()?'on':'off';}
export function projectorEnabled(){return typeof document!=='undefined'&&document.documentElement?.dataset.projector==='on';}
type Box={left:number;top:number;width:number;height:number};
export function projectorNeighbour(boxes:Box[],current:number,direction:string){
 if(!boxes.length)return -1;if(current<0||!boxes[current])return 0;
 const origin=boxes[current],x=origin.left+origin.width/2,y=origin.top+origin.height/2,horizontal=direction==='ArrowLeft'||direction==='ArrowRight',sign=direction==='ArrowLeft'||direction==='ArrowUp'?-1:1;
 let best=-1,score=Infinity;
 boxes.forEach((box,index)=>{if(index===current)return;const dx=box.left+box.width/2-x,dy=box.top+box.height/2-y,forward=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);if(forward<1)return;const value=forward+cross*3;if(value<score){score=value;best=index;}});
 return best;
}
/** App-owned controls only. Never intercept native form editing or iframe keys. */
export function handleProjectorKey(event:any,root:HTMLElement|null,actions:{fullscreen?:()=>void;back?:()=>void}={}){
 if(!root||!projectorEnabled()||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return false;
 const target=event.target as HTMLElement;
 if(target?.closest?.('input,textarea,select,[contenteditable="true"]'))return false;
 if(event.key.toLowerCase()==='f'&&actions.fullscreen){event.preventDefault();actions.fullscreen();return true;}
 if(['BrowserBack','GoBack','Backspace'].includes(event.key)&&actions.back){event.preventDefault();actions.back();return true;}
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return false;
 const controls=[...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select:not([disabled]),input:not([disabled]),[tabindex="0"]')].filter(el=>el.getAttribute('aria-disabled')!=='true'&&el.getClientRects().length>0);
 const current=controls.findIndex(el=>el===target||el.contains(target)),next=projectorNeighbour(controls.map(el=>el.getBoundingClientRect()),current,event.key);
 event.preventDefault();if(next>=0){controls[next].focus();controls[next].scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant' as ScrollBehavior});}return true;
}
