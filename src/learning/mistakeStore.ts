export interface MistakeRecord {id:string;topic:string;prompt:string;reason:string;hintUsed:number;timestamp:number;}
const KEY='calcora_mistakes_v1';
function read():MistakeRecord[]{if(typeof localStorage==='undefined')return [];try{return JSON.parse(localStorage.getItem(KEY)||'[]') as MistakeRecord[];}catch{return [];}}
function write(items:MistakeRecord[]){try{localStorage.setItem(KEY,JSON.stringify(items.slice(-100)));}catch{/* optional storage */}}
export function recordMistake(topic:string,prompt:string,reason:string,hintUsed=0):MistakeRecord{const item={id:crypto.randomUUID(),topic,prompt,reason,hintUsed,timestamp:Date.now()};write([...read(),item]);return item;}
export function getMistakes(topic?:string):MistakeRecord[]{const all=read();return topic?all.filter(x=>x.topic===topic):all;}
export function clearMistakes(){try{localStorage.removeItem(KEY);}catch{/* optional storage */}}
