type TouchPoint={x:number;y:number;at:number};
export function swipeDirection(start:TouchPoint,end:TouchPoint,width:number):'back'|'forward'|null{
 const dx=end.x-start.x,dy=end.y-start.y,elapsed=end.at-start.at;
 // Edge gestures belong to the browser/OS; never trigger a second navigation.
 if(start.x<24||start.x>width-24||elapsed<30||elapsed>700||Math.abs(dx)<90||Math.abs(dy)>65||Math.abs(dx)<Math.abs(dy)*1.8)return null;
 return dx>0?'back':'forward';
}
export function attachSwipeNavigation({back,forward,canBack,canForward,host=document,view=window}:{back:()=>void;forward:()=>void;canBack:()=>boolean;canForward:()=>boolean;host?:Document;view?:Window}){
 let start:TouchPoint|null=null;
 const blocked=(target:EventTarget|null)=>{
  if(!(target instanceof Element))return true;
  const control=target.closest('a,button,input,select,textarea,video,audio,iframe,[role="dialog"],[role="slider"],[role="tablist"],[contenteditable="true"],[data-no-swipe],.glass-switch,.league-navigation,.nation-rail,.player-area');
  if(control&&!control.matches('.score-match,.game-card,.club-pick'))return true;
  if(host.querySelector('[role="dialog"],.stream-popup-overlay')||view.getSelection()?.isCollapsed===false)return true;
  for(let el:Element|null=target;el;el=el.parentElement){const css=view.getComputedStyle(el);if(/auto|scroll/.test(css.overflowX)&&el.scrollWidth>el.clientWidth+2)return true;}
  return false;
 };
 const begin=(event:TouchEvent)=>{start=null;if(event.touches.length!==1||blocked(event.target))return;const p=event.touches[0];start={x:p.clientX,y:p.clientY,at:Date.now()};};
 const cancel=()=>{start=null;};
 const finish=(event:TouchEvent)=>{const from=start;start=null;if(!from||event.touches.length||event.changedTouches.length!==1||view.getSelection()?.isCollapsed===false)return;const p=event.changedTouches[0],direction=swipeDirection(from,{x:p.clientX,y:p.clientY,at:Date.now()},view.innerWidth);if(direction==='back'&&canBack()){if(event.cancelable)event.preventDefault();back();}else if(direction==='forward'&&canForward()){if(event.cancelable)event.preventDefault();forward();}};
 host.addEventListener('touchstart',begin,{passive:true});host.addEventListener('touchend',finish,{passive:false});host.addEventListener('touchcancel',cancel,{passive:true});
 return()=>{cancel();host.removeEventListener('touchstart',begin);host.removeEventListener('touchend',finish);host.removeEventListener('touchcancel',cancel);};
}
