export interface MasteryTopic { topic:string; attempts:number; correct:number; hints:number; lastSeen:number; mastery:number; }

const KEY='calcora_mastery_v1';
const clamp=(n:number,min=0,max=1)=>Math.min(max,Math.max(min,n));

function read():Record<string,MasteryTopic>{
  if(typeof localStorage==='undefined') return {};
  try{return JSON.parse(localStorage.getItem(KEY)||'{}') as Record<string,MasteryTopic>;}catch{return {};}
}
function write(data:Record<string,MasteryTopic>){try{localStorage.setItem(KEY,JSON.stringify(data));}catch{/* storage is optional */}}

export function recordPractice(topic:string,correct:boolean,hintsUsed=0):MasteryTopic{
  const data=read(); const previous=data[topic]||{topic,attempts:0,correct:0,hints:0,lastSeen:0,mastery:0.5};
  const attempts=previous.attempts+1;
  const correctness=(previous.correct+(correct?1:0))/attempts;
  const hintPenalty=Math.min(0.2,hintsUsed*0.03);
  const mastery=clamp(0.35*previous.mastery+0.65*clamp(correctness-hintPenalty));
  const next={...previous,attempts,correct:previous.correct+(correct?1:0),hints:previous.hints+hintsUsed,lastSeen:Date.now(),mastery};
  data[topic]=next; write(data); return next;
}

export function getMastery(topic:string):MasteryTopic{return read()[topic]||{topic,attempts:0,correct:0,hints:0,lastSeen:0,mastery:0.5};}
export function getAllMastery():MasteryTopic[]{return Object.values(read()).sort((a,b)=>b.lastSeen-a.lastSeen);}
export function recommendedDifficulty(topic:string):'beginner'|'intermediate'|'advanced'{const m=getMastery(topic).mastery; return m<0.45?'beginner':m<0.75?'intermediate':'advanced';}
