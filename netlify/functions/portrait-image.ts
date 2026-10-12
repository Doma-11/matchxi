import type {Config} from '@netlify/functions';
import {authorize,unauthorized,protectResponse} from '../lib/private-auth';
import {meter} from '../../app/usage-meter';
import {GET} from '../../app/api/portrait-image/route';
export default async(request:Request)=>{if(!await authorize(request))return unauthorized();return protectResponse(await meter('portrait-image',async()=>request.method==='GET'?GET(request):new Response(null,{status:405})));};

export const config:Config={path:['/api/portrait-image','/.netlify/functions/portrait-image'],rateLimit:{windowLimit:180,windowSize:60,aggregateBy:['ip','domain']}};
