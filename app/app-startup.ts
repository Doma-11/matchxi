/** The initial HTML owns one loader, so auth, lazy import and match loading
 * never replace/restart its animation. Release it after content has committed.
 */
export function showAppStartup(){
 const screen=document.getElementById('app-startup'),root=document.getElementById('root');
 if(!screen||!root)return;
 screen.hidden=false;root.setAttribute('inert','');root.setAttribute('aria-hidden','true');
}
export function finishAppStartup(){
 const screen=document.getElementById('app-startup'),root=document.getElementById('root');
 if(screen)screen.hidden=true;
 root?.removeAttribute('inert');root?.removeAttribute('aria-hidden');
}
