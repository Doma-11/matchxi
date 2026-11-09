import {build} from 'esbuild';import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('qa-temp',{recursive:true});
const built=await build({stdin:{contents:"export {default} from './app/match-tickets';export * from './app/match-tickets';export {default as TicketSettings} from './app/match-ticket-settings';export * from './app/match-ticket-design';export * from './app/matchday-seating';",resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',packages:'external',write:false,jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'ticket-hooks',setup(b){b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'hooks'}));b.onLoad({filter:/.*/,namespace:'hooks'},()=>({contents:'export const useState=(...a)=>globalThis.__streamHooks.state(...a),useRef=(...a)=>globalThis.__streamHooks.ref(...a),useEffect=(...a)=>globalThis.__streamHooks.effect(...a);'}));}}]});
await writeFile('qa-temp/ticket-interactions.mjs',built.outputFiles[0].text);const {default:Collection,WatchedTicketControl,InlineTicketCard,ticketQrOptions,TicketSettings,readTicketDesign,saveTicketDesign,TICKET_DESIGN_KEY,PassFront,HomeStadiumArt,ticketPassArtwork,ticketReference,ticketSeating,passCompetitionLogo}=await import('../qa-temp/ticket-interactions.mjs');
function hooks(Component,initial){const slots=[],pending=[];let cursor=0,dirty=true,props=initial,tree;const same=(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const environment={state(initial){const n=cursor++;if(!(n in slots))slots[n]={value:typeof initial==='function'?initial():initial};return[slots[n].value,v=>{const next=typeof v==='function'?v(slots[n].value):v;if(!Object.is(next,slots[n].value)){slots[n].value=next;dirty=true;}}];},ref(value){const n=cursor++;return slots[n]??(slots[n]={current:value});},effect(fn,deps){const n=cursor++;if(!slots[n]||!same(slots[n].deps,deps)){const previous=slots[n];slots[n]={deps,cleanup:previous?.cleanup};pending.push(()=>{previous?.cleanup?.();slots[n].cleanup=fn();});}},id(){const n=cursor++;return 'stream-test-'+n;}};
 const render=()=>{for(let loops=0;dirty;loops++){assert.ok(loops<30,'effects settle');dirty=false;cursor=0;globalThis.__streamHooks=environment;tree=Component(props);for(const work of pending.splice(0))work();}return tree;};
 return {render,setProps(next){props=next;dirty=true;return render();},unmount(){for(const slot of slots)slot?.cleanup?.();delete globalThis.__streamHooks;}};
}
const nodes=(value,predicate)=>{const found=[];const visit=node=>{if(Array.isArray(node)){node.forEach(visit);return;}if(!node||typeof node!=='object')return;if(predicate(node))found.push(node);visit(node.props?.children);};visit(value);return found;};
const find=(tree,p)=>{const values=nodes(tree,p);assert.ok(values.length,'requested control exists');return values[0];};
const button=(tree,label)=>find(tree,n=>n.type==='button'&&n.props['aria-label']===label);
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
async function flush(ui){for(let i=0;i<16;i++){await new Promise(resolve=>setImmediate(resolve));ui.render();}return ui.render();}
function environment(){const old=globalThis.window,win=new EventTarget();win.localStorage=storage();globalThis.window=win;return {win,restore(){globalThis.window=old}};}
const fixture={id:'ui-42',league:'uefa.champions',date:'2026-11-04T20:00:00Z',state:'in',completed:false,home:{id:'359',name:'Arsenal',score:1},away:{id:'86',name:'Real Madrid',score:1}};
test('Broadcast checkbox saves once, reflects durable state, and opens the collection through the supplied action',async()=>{const env=environment();let opened=0;const ui=hooks(WatchedTicketControl,{game:fixture,videos:[],onCollection:()=>opened++});try{let tree=await flush(ui);const checkbox=find(tree,n=>n.type==='input'&&n.props.type==='checkbox');assert.equal(checkbox.props.checked,false);checkbox.props.onChange({target:{checked:true}});tree=await flush(ui);const saved=find(tree,n=>n.type==='input');assert.equal(saved.props.checked,true);assert.equal(saved.props.disabled,true);assert.equal(JSON.parse(env.win.localStorage.getItem('matchxi-match-tickets-v1')).length,1);find(tree,n=>n.type==='button').props.onClick();assert.equal(opened,1);}finally{ui.unmount();env.restore()}});
test('saving failure is exposed and checkbox never claims success',async()=>{const env=environment();env.win.localStorage.setItem=()=>{throw Error('Quota')};const ui=hooks(WatchedTicketControl,{game:fixture});try{let tree=await flush(ui);find(tree,n=>n.type==='input').props.onChange({target:{checked:true}});tree=await flush(ui);assert.equal(find(tree,n=>n.type==='input').props.checked,false);assert.ok(nodes(tree,n=>n.props?.role==='alert').length);}finally{ui.unmount();env.restore()}});
test('collection renders inline tickets and preserves favourite/deletion handlers without a dialog',async()=>{
 const env=environment(),saver=hooks(WatchedTicketControl,{game:fixture});
 try{const tree=await flush(saver);find(tree,n=>n.type==='input').props.onChange({target:{checked:true}});await flush(saver)}finally{saver.unmount()}
 const ui=hooks(Collection,{onMatch(){},onBrowse(){}});
 try{let tree=await flush(ui);assert.equal(nodes(tree,n=>n.type==='input'||n.type==='select'||n.type==='footer').length,0);let card=find(tree,n=>n.type===InlineTicketCard);card.props.onFavourite();tree=await flush(ui);card=find(tree,n=>n.type===InlineTicketCard);assert.equal(card.props.ticket.favourite,true);find(tree,n=>n.type==='button'&&n.key==='favourites').props.onClick();tree=await flush(ui);card=find(tree,n=>n.type===InlineTicketCard);card.props.onDelete();tree=await flush(ui);assert.equal(nodes(tree,n=>n.type===InlineTicketCard).length,0);assert.equal(JSON.parse(env.win.localStorage.getItem('matchxi-match-tickets-v1')).length,0);assert.ok(nodes(tree,n=>n.props?.role==='status').length);assert.equal(nodes(tree,n=>n.props?.role==='dialog').length,0)}finally{ui.unmount();env.restore()}
});
const savedVideo={id:'MATCHVID001',url:'https://www.youtube.com/watch?v=MATCHVID001',title:'Saved highlights',publisher:'Publisher',thumbnail:'https://i.ytimg.com/vi/MATCHVID001/hqdefault.jpg',embedAllowed:true};
const cardTicket=(extra={})=>({version:1,game:{...fixture,matchday:6},id:'uefa.champions:ui-42',competition:{name:'Champions League'},highlights:[savedVideo],season:'2026/27',...extra});
const front=tree=>find(tree,n=>n.props?.className==='virtual-ticket ticket-front ticket-compact');
const back=tree=>find(tree,n=>n.props?.className==='virtual-ticket ticket-back');
test('whole-front click flips the same inline stage in 3D; saved highlights are always YouTube links with no player/search',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('No new searches')};const ui=hooks(InlineTicketCard,{ticket:cardTicket(),onFavourite(){},onDelete(){},onMatch(){}});
 try{let tree=await flush(ui);const stage=tree.props.className,style=tree.props.style;assert.equal(back(tree).props.inert,true);assert.equal(front(tree).props.inert,false);button(tree,'Flip ticket: Arsenal vs Real Madrid to highlights').props.onClick();tree=await flush(ui);assert.equal(tree.props.className,stage);assert.deepEqual(tree.props.style,style);assert.equal(front(tree).props.inert,true);assert.equal(back(tree).props.inert,false);assert.equal(find(tree,n=>n.props?.className?.startsWith('ticket-flip-inner')).props.className,'ticket-flip-inner is-flipped');const links=nodes(tree,n=>n.type==='a');assert.equal(links.length,1);for(const link of links){assert.equal(link.props.href,savedVideo.url);assert.equal(link.props.target,'_blank');assert.equal(link.props.rel,'noopener noreferrer')}assert.equal(nodes(tree,n=>n.type==='iframe'||n.props?.video||n.props?.role==='dialog').length,0);assert.equal(nodes(back(tree),n=>n.type==='button').length,1);button(tree,'Flip ticket: Arsenal vs Real Madrid to front').props.onClick();tree=await flush(ui);assert.equal(front(tree).props.inert,false);assert.equal(calls,0)}finally{ui.unmount();globalThis.fetch=original}
});
test('front footer actions do not flip or expand the card and delete confirmation stays inside it',async()=>{
 let returned=null,removed=0;const ticket=cardTicket(),ui=hooks(InlineTicketCard,{ticket,onFavourite(){},onDelete(){removed++},onMatch:g=>returned=g});
 try{let tree=await flush(ui);button(tree,'Return to match: Arsenal vs Real Madrid').props.onClick();tree=await flush(ui);assert.equal(returned,ticket.game);assert.equal(back(tree).props.inert,true);button(tree,'Delete ticket: Arsenal vs Real Madrid').props.onClick();tree=await flush(ui);assert.ok(find(tree,n=>n.props?.className==='ticket-delete-confirm'));assert.equal(find(tree,n=>n.props?.className==='ticket-front-content').props.inert,true);assert.equal(back(tree).props.inert,true);find(tree,n=>n.type==='button'&&n.props.children==='Keep ticket').props.onClick();tree=await flush(ui);assert.equal(nodes(tree,n=>n.props?.className==='ticket-delete-confirm').length,0);button(tree,'Delete ticket: Arsenal vs Real Madrid').props.onClick();tree=await flush(ui);find(tree,n=>n.type==='button'&&n.props.children==='Delete permanently').props.onClick();assert.equal(removed,1)}finally{ui.unmount()}
});
test('pending highlights have no fake QR and restricted videos use the same external design',async()=>{
 for(const highlights of [[],[{...savedVideo,embedAllowed:false}]]){const ui=hooks(InlineTicketCard,{ticket:cardTicket({game:{...fixture,matchday:null},highlights}),onFavourite(){},onDelete(){},onMatch(){}});try{const tree=await flush(ui);assert.equal(nodes(tree,n=>n.type==='iframe'||n.props?.video).length,0);if(!highlights.length){assert.ok(nodes(tree,n=>n.props?.className==='ticket-highlights-pending'&&n.props.children==='Highlights pending').length);assert.equal(nodes(tree,n=>n.props?.url).length,0)}else assert.equal(find(tree,n=>n.type==='a'&&n.props.className==='ticket-highlight-preview').props.href,savedVideo.url)}finally{ui.unmount()}}
});
test('front QR uses a transparent background and readable light modules',()=>{assert.equal(ticketQrOptions.color.light,'#00000000');assert.equal(ticketQrOptions.color.dark,'#fff2ceff');assert.equal(ticketQrOptions.margin,4)});

test('collection has only four category buttons and no old heading or backup tools',async()=>{const env=environment(),ui=hooks(Collection,{onMatch(){},onBrowse(){}});try{const tree=await flush(ui);assert.deepEqual(nodes(tree,n=>n.type==='button'&&['all','clubs','national','favourites'].includes(n.key)).map(n=>n.key),['all','clubs','national','favourites']);assert.equal(nodes(tree,n=>n.type==='select'||n.type==='footer'||n.props?.className==='ticket-eyebrow'||n.type==='input').length,0)}finally{ui.unmount();env.restore()}});
test('both designs keep the same inline flip and saved highlight destination',async()=>{for(const design of ['current','matchday']){const ui=hooks(InlineTicketCard,{ticket:cardTicket(),design,onFavourite(){},onDelete(){},onMatch(){}});try{let tree=await flush(ui);assert.ok(tree.props.className.endsWith('ticket-design-'+design));button(tree,'Flip ticket: Arsenal vs Real Madrid to highlights').props.onClick();tree=await flush(ui);assert.equal(find(tree,n=>n.type==='a').props.href,savedVideo.url);assert.equal(nodes(tree,n=>n.type==='iframe').length,0)}finally{ui.unmount()}}});

test('Settings offers exactly two persistent designs and backup controls; storage failure does not claim selection',async()=>{const env=environment(),ui=hooks(TicketSettings,{});try{let tree=await flush(ui);const choices=()=>nodes(tree,n=>n.type==='button'&&['current','matchday'].includes(n.key));assert.equal(choices().length,2);assert.equal(choices()[0].props['aria-pressed'],true);choices()[1].props.onClick();tree=await flush(ui);assert.equal(readTicketDesign(),'matchday');assert.equal(choices()[1].props['aria-pressed'],true);assert.equal(find(tree,n=>n.type==='input'&&n.props.type==='file').props.hidden,true);env.win.localStorage.setItem=()=>{throw Error('quota')};choices()[0].props.onClick();tree=await flush(ui);assert.equal(choices()[1].props['aria-pressed'],true);assert.ok(nodes(tree,n=>n.props?.role==='alert').length)}finally{ui.unmount();env.restore()}});
test('unknown preferences fall back to original and design changes never change tickets',()=>{const env=environment();try{env.win.localStorage.setItem(TICKET_DESIGN_KEY,'unknown');assert.equal(readTicketDesign(),'current');env.win.localStorage.setItem('matchxi-match-tickets-v1','[]');saveTicketDesign('matchday');assert.equal(env.win.localStorage.getItem('matchxi-match-tickets-v1'),'[]');assert.throws(()=>saveTicketDesign('invalid'));assert.equal(readTicketDesign(),'matchday')}finally{env.restore()}});

function hintEnvironment(t,reduced=false){
 const env=environment(),old=globalThis.document,doc=new EventTarget();doc.visibilityState='visible';globalThis.document=doc;env.win.matchMedia=()=>({matches:reduced});
 t.mock.timers.enable({apis:['setTimeout']});
 return {doc,restore(){t.mock.timers.reset();env.restore();globalThis.document=old}};
}
test('entry hint smoothly shows back then front once, without resizing or moving focus',async t=>{
 const env=hintEnvironment(t);let started=0;const ui=hooks(InlineTicketCard,{ticket:cardTicket(),autoFlipHint:true,onHintStarted(){started++},onFavourite(){},onDelete(){},onMatch(){}});
 try{let tree=await flush(ui);const style=tree.props.style;assert.equal(front(tree).props.inert,false);t.mock.timers.tick(550);tree=ui.render();assert.equal(back(tree).props.inert,false);assert.deepEqual(tree.props.style,style);t.mock.timers.tick(1000);tree=ui.render();assert.equal(front(tree).props.inert,false);t.mock.timers.tick(10000);tree=ui.render();assert.equal(front(tree).props.inert,false);assert.equal(started,1)}finally{ui.unmount();env.restore()}
});
test('interaction cancels entry hint and does not undo a manual flip',async t=>{
 const env=hintEnvironment(t),ui=hooks(InlineTicketCard,{ticket:cardTicket(),autoFlipHint:true,onFavourite(){},onDelete(){},onMatch(){}});
 try{let tree=await flush(ui);tree.props.onPointerDownCapture();button(tree,'Flip ticket: Arsenal vs Real Madrid to highlights').props.onClick();t.mock.timers.tick(10000);tree=ui.render();assert.equal(back(tree).props.inert,false);env.doc.visibilityState='hidden';env.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(back(ui.render()).props.inert,false)}finally{ui.unmount();env.restore()}
});
test('reduced motion skips the automatic flip; leaving or hiding clears pending work',async t=>{
 for(const mode of ['reduced','hidden','unmount']){
  const env=hintEnvironment(t,mode==='reduced'),ui=hooks(InlineTicketCard,{ticket:cardTicket(),autoFlipHint:true,onFavourite(){},onDelete(){},onMatch(){}});
  try{await flush(ui);if(mode==='hidden'){t.mock.timers.tick(550);ui.render();env.doc.visibilityState='hidden';env.doc.dispatchEvent(new Event('visibilitychange'))}if(mode==='unmount')ui.unmount();t.mock.timers.tick(10000);if(mode!=='unmount')assert.equal(front(ui.render()).props.inert,false);}finally{if(mode!=='unmount')ui.unmount();env.restore()}
 }
});
test('collection hints only its first card and does not repeat after filtering',async()=>{
 const env=environment();env.win.localStorage.setItem('matchxi-match-tickets-v1',JSON.stringify([cardTicket({savedAt:'2026-11-08T08:00:00Z'}),cardTicket({id:'uefa.champions:second',game:{...fixture,id:'second'},savedAt:'2026-11-08T08:00:00Z'})]));
 const ui=hooks(Collection,{showFlipHint:true,onMatch(){},onBrowse(){}});
 try{let tree=await flush(ui);let cards=nodes(tree,n=>n.type===InlineTicketCard);assert.deepEqual(cards.map(c=>c.props.autoFlipHint),[true,false]);cards[0].props.onHintStarted();find(tree,n=>n.type==='button'&&n.key==='national').props.onClick();tree=await flush(ui);find(tree,n=>n.type==='button'&&n.key==='all').props.onClick();tree=await flush(ui);cards=nodes(tree,n=>n.type===InlineTicketCard);assert.ok(cards.every(c=>!c.props.autoFlipHint))}finally{ui.unmount();env.restore()}
});


test('Matchday selects league stadium treatments and excludes stadiums for the three UEFA club cups',async()=>{
 const leagueTreatments={'eng.1':'panorama','esp.1':'emboss','ger.1':'stub','ita.1':'frame'};
 for(const league of ['uefa.champions','uefa.europa','uefa.europa.conf','eng.1','esp.1','ger.1','ita.1','cro.1','uefa.nations','uefa.euro','fifa.world','fifa.friendly','fifa.worldq.uefa']){
  const expected=leagueTreatments[league]??(['uefa.champions','uefa.europa','uefa.europa.conf'].includes(league)?'competition':'stadium');
  assert.equal(ticketPassArtwork(league),expected);
  const ui=hooks(InlineTicketCard,{ticket:cardTicket({game:{...fixture,league}}),design:'matchday',onFavourite(){},onDelete(){},onMatch(){}});
  try{const tree=await flush(ui);assert.equal(tree.props['data-pass-art'],expected);assert.equal(nodes(tree,n=>n.props?.className==='ticket-pass-actions').length,1)}finally{ui.unmount()}
 }
});
test('Matchday paper tickets show real venue, fixture reference and stable decorative seating',()=>{
 const ticket=cardTicket({game:{...fixture,completed:true,venue:'Elland Road, Leeds',matchday:12},season:'2026/27'});
 const tree=PassFront({ticket,score:'1 – 0',video:savedVideo});
 assert.equal(ticketReference(ticket),'UCL-ui-42');
 assert.ok(nodes(tree,n=>n.type==='span'&&n.props.children==='Elland Road, Leeds').length);
 assert.ok(nodes(tree,n=>n.type==='b'&&n.props.children==='FULL TIME').length);
 const seat=ticketSeating(ticket);assert.ok(nodes(tree,n=>n.type==='b'&&n.props.children===seat.row).length);assert.ok(nodes(tree,n=>n.type==='b'&&n.props.children===seat.seat).length);
 const missing=PassFront({ticket:cardTicket(),score:'VS'});
 assert.ok(nodes(missing,n=>n.type==='span'&&n.props.children==='Virtual matchday ticket').length);
 assert.ok(nodes(missing,n=>n.type==='b'&&n.props.children==='SCORE PENDING').length);
 assert.equal(nodes(tree,n=>typeof n.props?.children==='string'&&/KEEPSAKE|WATCHED LIVE/.test(n.props.children)).length,0);assert.equal(nodes(tree,n=>n.props?.children==='MATCHDAY').length,2);
});
test('the back offers the primary saved video and front navigation while collection actions are inactive',async()=>{
 let removed=0;
 const secondVideo={...savedVideo,id:'MATCHVID002',url:'https://www.youtube.com/watch?v=MATCHVID002'};
 const ticket=cardTicket({highlights:[savedVideo,secondVideo]});
 const ui=hooks(InlineTicketCard,{ticket,design:'matchday',onFavourite(){},onDelete(){removed++},onMatch(){}});
 const actions=tree=>find(tree,n=>n.props?.className==='ticket-pass-actions');
 try{
  let tree=await flush(ui);
  assert.equal(actions(tree).props.inert,false);
  button(tree,'Flip ticket: Arsenal vs Real Madrid to highlights').props.onClick();
  tree=await flush(ui);
  assert.equal(back(tree).props.inert,false);
  assert.equal(actions(tree).props.inert,true);
  assert.equal(actions(tree).props['aria-hidden'],true);
  assert.deepEqual(nodes(back(tree),n=>n.type==='a').map(n=>n.props.href),[savedVideo.url]);
  assert.equal(nodes(back(tree),n=>n.type==='select').length,0);
  button(tree,'Flip ticket: Arsenal vs Real Madrid to front').props.onClick();
  tree=await flush(ui);
  assert.equal(front(tree).props.inert,false);
  assert.equal(actions(tree).props.inert,false);
  button(tree,'Delete ticket: Arsenal vs Real Madrid').props.onClick();
  tree=await flush(ui);
  find(tree,n=>n.type==='button'&&n.props.children==='Delete permanently').props.onClick();
  assert.equal(removed,1);
 }finally{ui.unmount()}
});

test('real stadium images load lazily and disappear cleanly if their source is unavailable',async()=>{
 const ticket=cardTicket({game:{...fixture,league:'esp.1',home:{name:'Real Madrid'},away:{name:'Liverpool'}}});
 const ui=hooks(HomeStadiumArt,{ticket});try{let tree=await flush(ui);const img=find(tree,n=>n.type==='img');assert.match(img.props.src,/bernabeu/);assert.equal(img.props.loading,'lazy');assert.equal(img.props.fetchPriority,'low');img.props.onError();tree=await flush(ui);assert.equal(tree,null)}finally{ui.unmount()}
});

test('national keepsakes show their fixed home ground when fixture venue is absent, preserving supplied venues',()=>{
 const ticket=cardTicket({national:true,game:{...fixture,league:'fifa.world',home:{name:'England'},away:{name:'France'},venue:null}});
 let tree=PassFront({ticket,score:'1 – 0'});assert.ok(nodes(tree,n=>n.type==='span'&&n.props.children==='Wembley Stadium').length);
 tree=PassFront({ticket:{...ticket,game:{...ticket.game,venue:'A supplied tournament stadium'}},score:'1 – 0'});assert.ok(nodes(tree,n=>n.type==='span'&&n.props.children==='A supplied tournament stadium').length);
});

 test('decorative seating is deterministic across favourite/export round trips and stays in valid ranges',()=>{
 const ticket=cardTicket(),first=ticketSeating(ticket);assert.deepEqual(ticketSeating(JSON.parse(JSON.stringify({...ticket,favourite:true}))),first);
 const seats=new Set();for(let i=0;i<100;i++){const s=ticketSeating({id:'fixture-'+i});assert.ok(s.row>=1&&s.row<=32);assert.ok(s.seat>=1&&s.seat<=420);seats.add(`${s.row}:${s.seat}`)}assert.ok(seats.size>90);
 });
 test('Nations League uses coloured artwork with dark lettering on paper; source credits are outside the ticket',async()=>{
 assert.equal(passCompetitionLogo(cardTicket({game:{...fixture,league:'uefa.nations'}})),'/logos/nations-league-ticket.svg');
 const ticket=cardTicket({game:{...fixture,league:'esp.1',home:{name:'Real Madrid'},away:{name:'Liverpool'}}}),ui=hooks(HomeStadiumArt,{ticket});try{const tree=await flush(ui);assert.equal(nodes(tree,n=>n.type==='a').length,0);assert.equal(nodes(tree,n=>n.type==='img').length,1)}finally{ui.unmount()}
 });


test('Bundesliga places its home stadium below the QR and Serie A has venue-specific frames with a fallback',async()=>{
 const german=cardTicket({game:{...fixture,league:'ger.1',home:{name:'Bayern Munich'}}});
 const pass=PassFront({ticket:german,score:'2 – 1',video:savedVideo});
 const stub=find(pass,n=>n.type==='aside');
 const art=find(stub,n=>n.type===HomeStadiumArt);
 assert.match(art.props.art.src,/bayern/);
 assert.equal(nodes(find(pass,n=>n.props?.className==='ticket-main ticket-pass-main'),n=>n.type===HomeStadiumArt).length,0);

 for(const [home,frame] of [['Internazionale','san-siro'],['AC Milan','san-siro'],['Roma','stadio-olimpico'],['Lazio','stadio-olimpico']]){
  const ticket=cardTicket({game:{...fixture,league:'ita.1',home:{name:home}}});
  const ui=hooks(HomeStadiumArt,{ticket});
  try{
   let tree=await flush(ui);
   const img=find(tree,n=>n.type==='img');
   assert.equal(img.props.src,'/stadiums/frames/'+frame+'.svg');
   assert.equal(tree.props['data-venue-frame'],'true');
   img.props.onError();
   tree=await flush(ui);
   assert.equal(tree.props['data-venue-frame'],undefined);
   const fallback=find(tree,n=>n.type==='img');
   assert.match(fallback.props.src,/\.webp$/);
   fallback.props.onError();
   assert.equal(await flush(ui),null);
  }finally{ui.unmount()}
 }
});
