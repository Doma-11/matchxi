import {allowedPublisher} from '../../highlights-data';
import {readCatalogue} from '../../catalogue-store';
export async function GET(){try{const [videos,games,status,dashboards]=await Promise.all(['video','game','status','dashboard'].map(readCatalogue));return Response.json({videos:videos.filter(allowedPublisher),games,status,dashboards},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Saved catalogue is temporarily unavailable'},{status:503});}}
