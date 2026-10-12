const formatter=new Intl.NumberFormat('en-US',{useGrouping:false,maximumFractionDigits:2});
export function roundStatNumber(value:number){return Number(formatter.format(value));}
export function formatStatValue(value:unknown){return String(value??'—').replace(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi,token=>{const number=Number(token);return Number.isFinite(number)?formatter.format(number):token});}
