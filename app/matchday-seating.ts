/** Decorative souvenir seating, stable across re-renders, exports and devices. */
export function ticketSeating(ticket:{id:string}){
 let hash=2166136261;
 for(const char of ticket.id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
 return {row:1+hash%32,seat:1+(hash>>>5)%420};
}
