import {USERNAME,serviceAuthorized,sessionOwner,privateHeaders,unauthorized} from './private-auth';
export async function reportAccessDenied(request:Request):Promise<Response|null>{
 if(serviceAuthorized(request))return null;
 const account=await sessionOwner(request);
 if(!account)return unauthorized();
 return account.username===USERNAME?null:Response.json({error:'Reports are available only to the owner.',code:'OWNER_REQUIRED'},{status:403,headers:privateHeaders});
}
