import type {Config} from '@netlify/functions';
import {authorize,unauthorized,protectResponse} from '../lib/private-auth';
import {meter} from '../../app/usage-meter';
import {GET} from '../../app/api/player-portraits/route';
export default async(request:Request)=>{if(!await authorize(request))return unauthorized();return protectResponse(await meter('player-portraits',async()=>request.method==='GET'?GET(request):new Response(null,{status:405})));};

export const config:Config={path:['/api/player-portraits','/.netlify/functions/player-portraits'],rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip','domain']}};
