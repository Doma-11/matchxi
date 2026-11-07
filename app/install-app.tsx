import {useSyncExternalStore} from 'react';
import {Download,CheckCircle2} from 'lucide-react';
import {initializePwaInstall} from './pwa-install';
import './install-app.css';
export default function InstallApp(){
 const controller=initializePwaInstall();
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
 const apple=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return <section className="settings-card install-app-card" aria-labelledby="install-app-title">
  <div className="settings-card-heading"><h2 id="install-app-title">Install MatchXI</h2><p>Add MatchXI to this device’s home screen or app launcher.</p></div>
  {state.installed?<p className="install-app-status" role="status"><CheckCircle2 size={19}/>MatchXI is running as an installed app.</p>:<>
   {state.available&&<button className="install-app-button" onClick={()=>void controller.install()}><Download size={19}/>Install MatchXI</button>}
   {state.busy&&<p role="status">Follow the installation prompt in your browser.</p>}
   {state.message&&<p role="status">{state.message}</p>}
   <details className="install-app-help" open={!state.available&&!state.busy}><summary>Installation help</summary>
    <p>{apple?'On iPhone or iPad, open MatchXI in Safari, then Share → Add to Home Screen.':'In Chrome, open the ⋮ menu and look for Install app or Add to Home screen. On desktop, also check the install icon in the address bar.'}</p>
    <p>If these options are missing, your browser or device may not support installation. Some projectors and TV launchers cannot add web apps. You can bookmark MatchXI instead; this button cannot enable unsupported installation.</p>
   </details>
  </>}
 </section>;
}
