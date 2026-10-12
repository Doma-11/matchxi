// One foreground request at a time; timers are cancelled while hidden/unmounted.
export function foregroundPolling(load:(signal:AbortSignal)=>Promise<unknown>,interval:()=>number|null,options:{immediate?:boolean;resume?:boolean}={}){
 let stopped=false,busy=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|null=null,rerun=false;
 const schedule=()=>{clearTimeout(timer);const ms=interval();if(!stopped&&document.visibilityState==='visible'&&ms!=null)timer=setTimeout(run,ms);};
 async function run(){clearTimeout(timer);if(stopped||document.visibilityState!=='visible')return;if(busy){rerun=true;return;}busy=true;controller=new AbortController();try{await load(controller.signal)}catch(e:any){if(e?.name!=='AbortError')console.warn('Foreground request unavailable');}finally{busy=false;controller=null;if(rerun&&!stopped&&document.visibilityState==='visible'){rerun=false;void run()}else schedule();}}
 const visibility=()=>{clearTimeout(timer);if(document.visibilityState!=='visible'){rerun=false;controller?.abort()}else if(options.resume!==false)void run();else schedule();};
 document.addEventListener('visibilitychange',visibility);if(options.immediate!==false)void run();else schedule();
 return {refresh:run,rearm:schedule,stop(){stopped=true;rerun=false;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility)}};
}
