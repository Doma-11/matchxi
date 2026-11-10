import {firstEmbeddableStream,streamGameKey,streamStep} from './stream-session';
export type MultiviewTile={game:any;streams:any[];index:number;player:any;busy:boolean;error:string;reloadCount?:number}|null;
/** Four independent selections, one shared cache, at most two discovery jobs. No timers. */
export function createMultiviewSession(client:any,changed:(tiles:MultiviewTile[])=>void,initial?:MultiviewTile){
 const tiles:MultiviewTile[]=[initial||null,null,null,null],requests:(AbortController|null)[]=[null,null,null,null];
 let disposed=false,active=0;const queue:(()=>Promise<void>)[]=[];
 const emit=()=>{if(!disposed)changed(tiles.map(tile=>tile?{...tile}:null));};
 const pump=()=>{while(!disposed&&active<2&&queue.length){const job=queue.shift()!;active++;void job().finally(()=>{active--;pump();});}};
 const valid=(i:number)=>Number.isInteger(i)&&i>=0&&i<4&&!disposed;
 const stop=(i:number)=>{requests[i]?.abort();requests[i]=null;};
 function load(i:number,game:any,source?:number){
  if(!valid(i)||!game||game.completed||game.state!=='in')return false;
  if(tiles.some((tile,j)=>j!==i&&tile&&streamGameKey(tile.game)===streamGameKey(game)))return false;
  const prior=tiles[i];stop(i);const controller=new AbortController();requests[i]=controller;
  tiles[i]={game,streams:source===undefined?[]:prior?.streams||[],index:source??0,player:null,busy:true,error:''};emit();
  const current=()=>!disposed&&!controller.signal.aborted&&requests[i]===controller;
  queue.push(async()=>{if(!current())return;try{
   const found=source===undefined?await client.listings(game,controller.signal):{streams:prior?.streams||[]};if(!current())return;
   if(!found.streams.length)throw Error('No streams available for this match.');
   tiles[i]={...tiles[i]!,streams:found.streams};emit();
   const result=source===undefined?await firstEmbeddableStream(found.streams,(stream,signal)=>client.player(stream,signal),controller.signal):{index:source,player:await client.player(found.streams[source],controller.signal)};
   if(!current())return;tiles[i]={...tiles[i]!,index:result.index,player:result.player,busy:false,error:result.player.embedAllowed?'':result.player.error||result.player.reason||'Use the external link for this source.'};emit();
  }catch(e:any){if(current()){tiles[i]={...tiles[i]!,busy:false,player:null,error:e.message||'Could not open this stream.'};emit();}}
  finally{if(current())requests[i]=null;}});pump();return true;
 }
 return {
  snapshot:()=>tiles.map(tile=>tile?{...tile}:null),
  select:(i:number,game:any)=>load(i,game),
  step(i:number,direction:number){if(!valid(i))return;const tile=tiles[i];if(tile&&!tile.busy&&tile.streams.length>1)load(i,tile.game,streamStep(tile.index,direction,tile.streams.length));},
  retry(i:number){if(valid(i)&&tiles[i]&&!tiles[i]!.busy)load(i,tiles[i]!.game);},
  reload(i:number){
   if(!valid(i))return;
   const tile=tiles[i];
   if(!tile?.player?.embedAllowed||tile.busy||tile.game.completed)return;
   tiles[i]={...tile,reloadCount:(tile.reloadCount??0)+1};
   emit();
  },
  remove(i:number){if(!valid(i))return;stop(i);tiles[i]=null;emit();},
  reconcile(games:any[]){
   if(disposed)return;
   const updates=new Map(games.map(game=>[streamGameKey(game),game]));
   let dirty=false;
   for(let i=0;i<tiles.length;i++){
    const tile=tiles[i];
    if(!tile||tile.game.completed)continue;
    const latest=updates.get(streamGameKey(tile.game));
    if(!latest||latest===tile.game)continue;

    // A cached scheduled record or an incomplete status update is not full time.
    if(latest.completed===true){
     stop(i);
     tiles[i]={...tile,game:latest,busy:false,player:null,error:'This match is no longer live.'};
    }else if(latest.state==='in'){
     tiles[i]={...tile,game:latest};
    }else continue;
    dirty=true;
   }
   if(dirty)emit();
  },
  dispose(){disposed=true;queue.length=0;requests.forEach(c=>c?.abort());}
 };
}
