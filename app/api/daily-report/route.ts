import {getStore} from '@netlify/blobs';
import {dailyFootballReport,zagrebDay} from '../../daily-football-report';
export async function GET(request:Request){
 const q=new URL(request.url).searchParams,date=q.get('date')||zagrebDay(new Date(Date.now()-86400000));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00Z'))||date>zagrebDay(new Date()))return Response.json({error:'Invalid report date'},{status:400});
 const store=getStore({name:'touchline-daily-reports'}),old:any=await store.get(date,{type:'json'});
 const report=old&&Date.now()-Date.parse(old.generatedAt)<300000?old:await dailyFootballReport(date);
 return Response.json(report,{headers:{'Cache-Control':'private, max-age=60'}});
}
