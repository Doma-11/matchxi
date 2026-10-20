from pathlib import Path
import random, math
out=Path('public/themes')
themes={'eng-1':('#9621ff','#da30ff','facets'),'esp-1':('#ff4b44','#ffab8f','diagonal'),'ita-1':('#0588ff','#2fdbff','facets'),'ger-1':('#e50028','#ff4444','stadium'),'cro-1':('#f00086','#ff45ae','shards'),'uefa-champions':('#123dff','#9b28ff','stars'),'uefa-europa':('#ff6900','#ff3600','angular'),'uefa-europa-conf':('#00bd49','#14f269','waves'),'uefa-nations':('#1b62b2','#e4bf21','flags'),'fifa-world':('#dab668','#ffe09a','gold'),'uefa-euro':('#1467eb','#16bdda','flags')}
for name,(primary,secondary,kind) in themes.items():
 r=random.Random(name);parts=[]
 if kind in ['facets','stars','stadium','shards','flags']:
  for side in [0,1]:
   for i in range(26):
    x=r.randrange(0,470);y=r.randrange(-80,600);w=r.randrange(60,210);h=r.randrange(50,180)
    pts=[(x,y),(x+w,y-h),(x+w//2,y+h)]
    if side:pts=[(1400-a,b) for a,b in pts]
    col=r.choice([primary,secondary]);parts.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in pts)}" fill="{col}" fill-opacity="{r.uniform(.07,.35):.2f}" stroke="{col}" stroke-opacity=".16" stroke-width=".8"/>')
   for i in range(6):
    y=60+i*80;x=0 if side==0 else 1400;dx=480 if side==0 else -480
    parts.append(f'<path d="M{x} {y} Q{x+dx//2} {y-100} {x+dx} {y-40}" fill="none" stroke="{primary}" stroke-opacity=".4" stroke-width="1"/>')
 if kind=='stars':
  for cx,cy,rad,col in [(170,150,210,primary),(1260,100,250,secondary)]:
   pts=[(cx+math.sin(i*math.pi/5)*rad*(1 if i%2==0 else .45),cy-math.cos(i*math.pi/5)*rad*(1 if i%2==0 else .45)) for i in range(10)]
   parts.append(f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a,b in pts)}" fill="{col}" fill-opacity=".11" stroke="{col}" stroke-opacity=".45"/>')
 if kind in ['waves','gold']:
  for i in range(28 if kind=='gold' else 13):
   y=-120+i*(23 if kind=='gold' else 57)
   parts.append(f'<path d="M-90 {y} C330 {y-80} 90 {y+420} 570 {y+350} M1490 {y} C1070 {y-80} 1310 {y+420} 830 {y+350}" fill="none" stroke="{primary}" stroke-opacity="{.45 if kind=="gold" else .48}" stroke-width="{.8 if kind=="gold" else 7+i%4}"/>')
 if kind in ['angular','diagonal']:
  for side in [0,1]:
   for i in range(9):
    x=-180+i*49;y=580
    pts=[(x,y),(x+330,-80),(x+375,-80),(x+55,y)] if kind=='diagonal' else [(x,y),(x+120,100+i*12),(430,280),(x+150,150+i*12),(x+45,y)]
    if side:pts=[(1400-a,b) for a,b in pts]
    parts.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in pts)}" fill="{secondary if i%3==0 else primary}" fill-opacity="{.28 if kind=="angular" else .35}"/>')
 if kind=='flags':
  colors=['#eb233b','#ffce24','#11a861','#1c69d5','#fbfbfb']
  for side in [0,1]:
   for i,col in enumerate(colors):
    pts=[(0,330+i*28),(0,395+i*28),(410-i*35,560),(500-i*35,560)]
    if side:pts=[(1400-a,b) for a,b in pts]
    parts.append(f'<polygon points="{" ".join(f"{a},{b}" for a,b in pts)}" fill="{col}" fill-opacity=".6"/>')
 svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 560" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="edge"><stop stop-color="white"/><stop offset=".38" stop-color="white" stop-opacity=".05"/><stop offset=".62" stop-color="white" stop-opacity=".05"/><stop offset="1" stop-color="white"/></linearGradient><mask id="m"><path fill="url(#edge)" d="M0 0h1400v560H0z"/></mask></defs><g mask="url(#m)">'+''.join(parts)+'</g></svg>'
 (out/(name+'.svg')).write_text(svg)
print('11 static vector patterns:',sum(p.stat().st_size for p in out.glob('*.svg')),'bytes total')
