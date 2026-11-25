/** Keep the initial HTML loader through auth/import/data loading and at least
 * one 1.5-second cycle. Match-section loaders have their own unchanged timing.
 */
export const STARTUP_CYCLE_MS=1500;
let revealTimer:ReturnType<typeof setTimeout>|undefined;
let shownAt=Date.now();
export function showAppStartup(){
 const screen=document.getElementById('app-startup'),root=document.getElementById('root');
 if(!screen||!root)return;
 clearTimeout(revealTimer);revealTimer=undefined;
 if(screen.hidden)shownAt=Date.now();
 screen.hidden=false;root.setAttribute('inert','');root.setAttribute('aria-hidden','true');
}
export function finishAppStartup(){
 const screen=document.getElementById('app-startup'),root=document.getElementById('root');
 clearTimeout(revealTimer);revealTimer=undefined;
 const reveal=()=>{if(screen)screen.hidden=true;root?.removeAttribute('inert');root?.removeAttribute('aria-hidden');revealTimer=undefined;};
 if(!screen||screen.hidden){reveal();return;}
 const ball=screen.querySelector('.touchline-ball');
 // Read the real CSS animation's elapsed time: downloading JavaScript must
 // not restart an animation that already completed its first visible cycle.
 // No animation (reduced motion) means no artificial animation wait.
 const elapsed=ball?.getAnimations?ball.getAnimations()[0]?.currentTime:Date.now()-shownAt;
 const remaining=typeof elapsed==='number'?Math.max(0,STARTUP_CYCLE_MS-elapsed):0;
 if(remaining>0)revealTimer=setTimeout(reveal,remaining);else reveal();
}
