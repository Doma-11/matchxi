type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
type State={available:boolean;installed:boolean;busy:boolean;message:string};
export function createInstallController(host:Window){
 const display=host.matchMedia('(display-mode: standalone)');
 let pending:InstallEvent|null=null;
 let state:State={available:false,installed:display.matches||!!(host.navigator as Navigator&{standalone?:boolean}).standalone,busy:false,message:''};
 const listeners=new Set<()=>void>();
 const update=(patch:Partial<State>)=>{state={...state,...patch};listeners.forEach(fn=>fn());};
 const installed=()=>{pending=null;update({installed:true,available:false,busy:false,message:''});};
 host.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();if(state.installed||state.busy)return;
  pending=event as InstallEvent;update({available:true,message:''});
 });
 host.addEventListener('appinstalled',installed);
 const displayChanged=()=>{if(display.matches)installed();};
 if(display.addEventListener)display.addEventListener('change',displayChanged);
 else display.addListener(displayChanged);
 return {
  getSnapshot:()=>state,
  subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},
  async install(){
   if(!pending||state.busy||state.installed)return;
   const event=pending;pending=null;update({busy:true,available:false,message:''});
   try{
    // Must be invoked synchronously from the user's click, before any await.
    await event.prompt();const choice=await event.userChoice;
    if(!state.installed)update({message:choice.outcome==='accepted'?'Installation requested. Follow your browser’s instructions.':'Installation cancelled. You can also use your browser’s Install app menu.'});
   }catch{if(!state.installed)update({message:'The browser could not open installation. Try its Install app or Add to Home screen menu.'});}
   finally{update({busy:false});}
  }
 };
}
let controller:ReturnType<typeof createInstallController>|undefined;
export function initializePwaInstall(){return controller??=createInstallController(window);}
