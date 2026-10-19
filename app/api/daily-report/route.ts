import {netlifyUsageForPeriod} from '../../netlify-usage-store';
import {reportAccessDenied} from '../../../netlify/lib/report-access';
import {getStore} from '@netlify/blobs';
import {dailyFootballReport,zagrebDay} from '../../daily-football-report';
export async function GET(request:Request){
 const denied=await reportAccessDenied(request);if(denied)return denied;
 const q=new URL(request.url).searchParams,date=q.get('date')||zagrebDay(new Date(Date.now()-86400000));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00Z'))||date>zagrebDay(new Date()))return Response.json({error:'Invalid report date'},{status:400});
 const store=getStore({name:'touchline-daily-reports'}),old:any=await store.get(date,{type:'json'});
 const report=old&&Date.now()-Date.parse(old.generatedAt)<300000?old:await dailyFootballReport(date);
 const end=new Date(Date.parse(date+'T12:00Z')+86400000).toISOString().slice(0,10);
 return Response.json({...report,netlifyUsage:await netlifyUsageForPeriod(date,end)},{headers:{'Cache-Control':'private, max-age=60'}});
}
