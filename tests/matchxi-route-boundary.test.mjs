import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync('netlify/functions/api.ts','utf8');
const config=readFileSync('netlify.toml','utf8');
const refresh=readFileSync('app/api/catalogue/refresh/route.ts','utf8');

test('all Netlify API requests are authorized before route handling',()=>{
 assert.match(api,/if\(!await authorize\(request\)\)return unauthorized\(\)/);
 assert.match(api,/request\.method!=='GET'/);
 assert.match(api,/if\(!routes\[name\]\)return Response\.json\(\{error:'Not found'/);
});
test('catalogue mutation handler remains unexposed until separately secured',()=>{
 assert.match(refresh,/export async function POST\(/);
 assert.doesNotMatch(api,/from ['"]\.\.\/\.\.\/app\/api\/catalogue\/refresh\/route/);
 assert.doesNotMatch(api,/['"]catalogue\/refresh['"]\s*:/);
});
test('private auth and portrait functions are not swallowed by generic API routing',()=>{
 assert.match(api,/excludedPath:\[['"]\/api\/auth['"],['"]\/api\/portrait-image['"],['"]\/api\/player-portraits['"]\]/);
 assert.match(config,/directory = "netlify\/functions"/);
});
test('Netlify build publishes MatchXI frontend and not the original production site',()=>{
 assert.match(config,/publish = "dist"/);
 assert.doesNotMatch(config,/touchline-football-hub\.netlify\.app/i);
});
