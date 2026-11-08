import sharp from 'sharp';
/** Derive the actual photo's architectural edges, never a generated stadium. */
export async function stadiumOutline(bytes:Uint8Array){
 const {data,info}=await sharp(bytes,{limitInputPixels:20_000_000}).rotate().flatten({background:'#fff'}).resize(512,340,{fit:'inside',withoutEnlargement:true}).greyscale().normalise().blur(.65).raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info,rgba=Buffer.alloc(w*h*4);
 const at=(x:number,y:number)=>data[y*w+x];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const gx=-at(x-1,y-1)+at(x+1,y-1)-2*at(x-1,y)+2*at(x+1,y)-at(x-1,y+1)+at(x+1,y+1);
  const gy=-at(x-1,y-1)-2*at(x,y-1)-at(x+1,y-1)+at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1);
  const edge=Math.sqrt(gx*gx+gy*gy)/4,fade=Math.min(1,x/12,(w-x)/12,y/12,(h-y)/12),i=(y*w+x)*4;
  rgba[i]=24;rgba[i+1]=44;rgba[i+2]=64;rgba[i+3]=Math.round(Math.min(220,Math.max(0,(edge-22)*4))*fade);
 }
 return new Uint8Array(await sharp(rgba,{raw:{width:w,height:h,channels:4}}).webp({quality:74,alphaQuality:76,effort:5}).toBuffer());
}
