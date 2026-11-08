/** Rebuild the reviewed catalogue without shipping source photographs. Run with Node 22+. */
import {build} from 'esbuild';
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
await mkdir('qa-temp/stadium-build',{recursive:true});
await build({entryPoints:['netlify/lib/stadium-outline.ts'],bundle:true,packages:'external',platform:'node',format:'esm',outfile:'qa-temp/stadium-build/outline.mjs'});
const {stadiumOutline}=await import('../qa-temp/stadium-build/outline.mjs');
const sources={...JSON.parse(await readFile('scripts/stadium-sources.json','utf8')),...JSON.parse(await readFile('scripts/national-stadium-sources.json','utf8'))};
for(const [slug,source] of Object.entries(sources)){
 const response=await fetch(source.photo,{headers:{'User-Agent':'MatchXI stadium artwork preparation/1.0 (https://matchxi.netlify.app)'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`${slug}: source returned ${response.status}`);
 let bytes=Buffer.from(await response.arrayBuffer());
 if(source.crop){const m=await sharp(bytes).metadata(),c=source.crop;bytes=await sharp(bytes).extract({left:Math.floor(m.width*c.left),top:Math.floor(m.height*c.top),width:Math.floor(m.width*c.width),height:Math.floor(m.height*c.height)}).toBuffer()}
 bytes=await sharp(bytes).resize(400,266,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
 const image=await stadiumOutline(bytes);await writeFile('public'+source.asset,image);console.log(slug,image.length);
}
