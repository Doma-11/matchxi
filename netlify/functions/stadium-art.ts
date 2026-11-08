import type {Config} from '@netlify/functions';
import {getStore} from '@netlify/blobs';
import {authorize,unauthorized,protectResponse} from '../lib/private-auth';
import {meter} from '../../app/usage-meter';
import {createStadiumArtService} from '../lib/stadium-art-service';
let service:ReturnType<typeof createStadiumArtService>|undefined;
export default async(request:Request)=>{
 if(!await authorize(request))return unauthorized();
 service??=createStadiumArtService({store:getStore({name:'matchxi-stadium-art',consistency:'strong'})});
 return protectResponse(await meter('stadium-art',()=>service!(request)));
};
export const config:Config={path:['/api/stadium-art','/.netlify/functions/stadium-art'],rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip','domain']}};
