import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export type IntelligenceSourceKind = 'model-catalog' | 'dataset-catalog' | 'release-feed' | 'official-docs';
export type IntelligenceItemStatus = 'candidate' | 'verified' | 'active' | 'rejected';
export interface IntelligenceSource { id:string; name:string; kind:IntelligenceSourceKind; url:string; enabled:boolean; tags:string[]; }
export interface IntelligenceItem { sourceId:string; sourceName:string; kind:IntelligenceSourceKind; title:string; url:string; summary:string; content:string; tags:string[]; license?:string|null; publishedAt?:string|null; contentHash:string; relevanceScore:number; status:IntelligenceItemStatus; }
export interface IntelligenceRun { startedAt:string; finishedAt:string; scannedSources:number; fetchedSources:number; discoveredItems:number; newItems:number; activatedItems:number; errors:string[]; }

const MAX_BODY_BYTES=1500000, MAX_ITEMS_PER_SOURCE=25, FETCH_TIMEOUT_MS=12000;
export const AI_INTELLIGENCE_SOURCES:readonly IntelligenceSource[]=[
{id:'huggingface-models',name:'Hugging Face Models',kind:'model-catalog',url:'https://huggingface.co/api/models?sort=lastModified&direction=-1&limit=25',enabled:true,tags:['models','open','metadata']},
{id:'huggingface-datasets',name:'Hugging Face Datasets',kind:'dataset-catalog',url:'https://huggingface.co/api/datasets?sort=lastModified&direction=-1&limit=25',enabled:true,tags:['datasets','open','metadata']},
{id:'ollama-library',name:'Ollama Library',kind:'model-catalog',url:'https://ollama.com/api/tags',enabled:true,tags:['local-models','ollama','metadata']},
{id:'openai-sdk-releases',name:'OpenAI SDK Releases',kind:'release-feed',url:'https://api.github.com/repos/openai/openai-python/releases?per_page=10',enabled:true,tags:['openai','sdk','releases']},
{id:'google-genai-releases',name:'Google GenAI SDK Releases',kind:'release-feed',url:'https://api.github.com/repos/googleapis/python-genai/releases?per_page=10',enabled:true,tags:['gemini','sdk','releases']},
{id:'anthropic-sdk-releases',name:'Anthropic SDK Releases',kind:'release-feed',url:'https://api.github.com/repos/anthropics/anthropic-sdk-python/releases?per_page=10',enabled:true,tags:['anthropic','sdk','releases']},
{id:'huggingface-hub-docs',name:'Hugging Face Hub API',kind:'official-docs',url:'https://huggingface.co/docs/hub/api',enabled:true,tags:['documentation','models','datasets','api']},
{id:'openai-docs',name:'OpenAI Platform Docs',kind:'official-docs',url:'https://platform.openai.com/docs',enabled:true,tags:['documentation','models','agents','api']},
{id:'anthropic-docs',name:'Anthropic Docs',kind:'official-docs',url:'https://docs.anthropic.com/',enabled:true,tags:['documentation','models','agents','api']},
{id:'google-ai-docs',name:'Google AI for Developers',kind:'official-docs',url:'https://ai.google.dev/',enabled:true,tags:['documentation','gemini','models','agents','api']},
{id:'mistral-docs',name:'Mistral AI Docs',kind:'official-docs',url:'https://docs.mistral.ai/',enabled:true,tags:['documentation','models','inference','api']},
{id:'groq-docs',name:'Groq Docs',kind:'official-docs',url:'https://console.groq.com/docs',enabled:true,tags:['documentation','inference','models','api']},
{id:'cohere-docs',name:'Cohere Docs',kind:'official-docs',url:'https://docs.cohere.com/',enabled:true,tags:['documentation','embeddings','rerank','models']},
{id:'langchain-docs',name:'LangChain Docs',kind:'official-docs',url:'https://docs.langchain.com/',enabled:true,tags:['agents','rag','tools','documentation']},
{id:'llamaindex-docs',name:'LlamaIndex Docs',kind:'official-docs',url:'https://docs.llamaindex.ai/',enabled:true,tags:['agents','rag','retrieval','documentation']},
{id:'mcp-docs',name:'Model Context Protocol',kind:'official-docs',url:'https://modelcontextprotocol.io/',enabled:true,tags:['mcp','tools','agents','documentation']}
];

const ALLOWED_HOSTS=new Set(['huggingface.co','ollama.com','api.github.com','platform.openai.com','docs.anthropic.com','ai.google.dev','docs.mistral.ai','console.groq.com','docs.cohere.com','docs.langchain.com','docs.llamaindex.ai','modelcontextprotocol.io']);
function allowed(raw:string){try{const u=new URL(raw);return u.protocol==='https:'&&ALLOWED_HOSTS.has(u.hostname)}catch{return false}}
async function fetchBounded(url:string){
 if(!allowed(url))throw new Error('Source URL is not on Calcora intelligence allowlist');
 const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS);
 try{
  const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json,text/html;q=0.9,text/plain;q=0.8','User-Agent':'Calcora-AI-Intelligence/1.0'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const reader=r.body?.getReader(); if(!reader)return (await r.text()).slice(0,MAX_BODY_BYTES);
  const chunks:Uint8Array[]=[];let total=0; while(true){const x=await reader.read();if(x.done)break;if(x.value){total+=x.value.byteLength;if(total>MAX_BODY_BYTES)throw new Error('Source response exceeded size limit');chunks.push(x.value)}}
  const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength}return new TextDecoder().decode(bytes);
 }finally{clearTimeout(timeout)}}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function relevance(title:string,summary:string,tags:string[]){const h=(title+' '+summary+' '+tags.join(' ')).toLowerCase();const terms=['ai','model','llm','language','math','reasoning','embedding','dataset','agent','tutor','inference'];return Math.min(1,0.25+terms.filter(t=>h.includes(t)).length*0.08)}
function normalize(source:IntelligenceSource,raw:string):IntelligenceItem[]{
 if(source.kind==='official-docs')return [{sourceId:source.id,sourceName:source.name,kind:source.kind,title:source.name,url:source.url,summary:raw.replace(/\s+/g,' ').slice(0,1200),content:raw.slice(0,30000),tags:source.tags,license:null,publishedAt:null,contentHash:sha(raw),relevanceScore:relevance(source.name,raw,source.tags),status:'active'}];
 let payload:any;try{payload=JSON.parse(raw)}catch{payload=[]} const arr=Array.isArray(payload)?payload:(Array.isArray(payload.models)?payload.models:[]);
 return arr.slice(0,MAX_ITEMS_PER_SOURCE).map((x:any)=>{const title=String(x.id??x.name??x.tag_name??'Unnamed item');const summary=String(x.pipeline_tag??x.description??x.body??x.details??'').replace(/[#*_`]/g,' ').slice(0,1500);const body=JSON.stringify(x).slice(0,30000);return {sourceId:source.id,sourceName:source.name,kind:source.kind,title,url:String(x.html_url??(source.kind==='model-catalog'&&source.id.startsWith('huggingface')?'https://huggingface.co/'+title:source.url)),summary,content:body,tags:[...source.tags,...(Array.isArray(x.tags)?x.tags.slice(0,12).map(String):[])],license:x.license?String(x.license):null,publishedAt:x.lastModified??x.published_at??null,contentHash:sha(body),relevanceScore:relevance(title,summary,source.tags),status:'candidate' as const}})
}
export async function scanAIIntelligenceSources(){const startedAt=new Date().toISOString(),items:IntelligenceItem[]=[],errors:string[]=[];let fetchedSources=0;for(const source of AI_INTELLIGENCE_SOURCES.filter(s=>s.enabled)){try{items.push(...normalize(source,await fetchBounded(source.url)));fetchedSources++}catch(e){errors.push(source.id+': '+(e instanceof Error?e.message:'fetch failed'))}}const unique=Array.from(new Map(items.map(i=>[i.contentHash,i])).values()).filter(i=>i.relevanceScore>=0.25);const finishedAt=new Date().toISOString();return {run:{startedAt,finishedAt,scannedSources:AI_INTELLIGENCE_SOURCES.filter(s=>s.enabled).length,fetchedSources,discoveredItems:unique.length,newItems:unique.length,activatedItems:0,errors},items:unique}}
export async function persistAIIntelligence(run:IntelligenceRun,items:IntelligenceItem[]){const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return run;const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data:existing}=await supabase.from('ai_intelligence_items').select('content_hash').in('content_hash',items.map(i=>i.contentHash).slice(0,500));const known=new Set((existing??[]).map((r:any)=>r.content_hash));const fresh=items.filter(i=>!known.has(i.contentHash));if(fresh.length){const {error}=await supabase.from('ai_intelligence_items').insert(fresh.map(i=>({source_id:i.sourceId,source_name:i.sourceName,kind:i.kind,title:i.title,url:i.url,summary:i.summary,content:i.content,tags:i.tags,license:i.license,published_at:i.publishedAt,content_hash:i.contentHash,relevance_score:i.relevanceScore,status:(i.kind === 'official-docs' || i.kind === 'model-catalog' || i.kind === 'dataset-catalog' || i.kind === 'release-feed' ? 'active' : 'candidate') as IntelligenceItemStatus})));if(error)throw error;
  const embedUrl = url.replace(/\/$/, '') + '/functions/v1/calcora-ai-intelligence-embed';
  for (const item of fresh.slice(0, 40)) { try { await fetch(embedUrl, { method:'POST', headers:{'content-type':'application/json',apikey:key}, body:JSON.stringify({itemId:(await supabase.from('ai_intelligence_items').select('id').eq('content_hash',item.contentHash).single()).data?.id, content:item.title+'\\n'+item.summary+'\\n'+item.content}) }); } catch { /* embedding is best-effort; metadata remains available */ } }
}const activatedCount=fresh.filter(i=>i.kind==='official-docs'||i.kind==='model-catalog'||i.kind==='dataset-catalog'||i.kind==='release-feed').length;const {error}=await supabase.from('ai_intelligence_runs').insert({started_at:run.startedAt,finished_at:run.finishedAt,scanned_sources:run.scannedSources,fetched_sources:run.fetchedSources,discovered_items:run.discoveredItems,new_items:fresh.length,activated_items:activatedCount,errors:run.errors});if(error)throw error;return {...run,newItems:fresh.length,activatedItems:activatedCount}}
let scheduled=false,lastRun:IntelligenceRun|null=null;
export async function runAIIntelligenceCycle(){const r=await scanAIIntelligenceSources();lastRun=await persistAIIntelligence(r.run,r.items);return lastRun}
export async function getAIIntelligenceStatus(){
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const base={scheduled,lastRun,sources:AI_INTELLIGENCE_SOURCES.map(({id,name,kind,enabled})=>({id,name,kind,enabled})),metrics:{intelligenceItems:0,activeItems:0,embeddings:0,evaluationRuns:0,evaluations:0,passedEvaluations:0,passRate:null as number|null,lastEmbeddingUpdate:null as string|null,lastEvaluationAt:null as string|null}};
 if(!url||!key)return base;
 try{
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const [{count:intelligenceItems},{count:activeItems},{count:embeddings},{count:evaluationRuns},{count:evaluations},{count:passedEvaluations}]=await Promise.all([
   supabase.from('ai_intelligence_items').select('id',{count:'exact',head:true}),
   supabase.from('ai_intelligence_items').select('id',{count:'exact',head:true}).eq('status','active'),
   supabase.from('ai_intelligence_embeddings').select('id',{count:'exact',head:true}),
   supabase.from('ai_tutor_learning_runs').select('id',{count:'exact',head:true}),
   supabase.from('ai_tutor_evaluations').select('id',{count:'exact',head:true}),
   supabase.from('ai_tutor_evaluations').select('id',{count:'exact',head:true}).eq('passed',true),
  ]);
  const [{data:lastEmbedding},{data:lastEvaluation}]=await Promise.all([
   supabase.from('ai_intelligence_embeddings').select('updated_at').order('updated_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('ai_tutor_learning_runs').select('created_at').order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  const total=evaluations??0;
  return {...base,metrics:{intelligenceItems:intelligenceItems??0,activeItems:activeItems??0,embeddings:embeddings??0,evaluationRuns:evaluationRuns??0,evaluations:total,passedEvaluations:passedEvaluations??0,passRate:total?(passedEvaluations??0)/total:null,lastEmbeddingUpdate:lastEmbedding?.updated_at??null,lastEvaluationAt:lastEvaluation?.created_at??null}};
 }catch{return base}
}
export function startAIIntelligenceScheduler(){if(scheduled)return;scheduled=true;void runAIIntelligenceCycle().catch(()=>undefined);setInterval(()=>void runAIIntelligenceCycle().catch(()=>undefined),24*60*60*1000)}
export async function getActiveAIIntelligenceContext(limit=12){
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return [];
 const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data}=await supabase.from('ai_intelligence_items').select('source_name,kind,title,url,summary,tags,published_at,relevance_score').eq('status','active').order('relevance_score',{ascending:false}).order('published_at',{ascending:false}).limit(Math.min(Math.max(limit,1),20));return data??[];
}

export async function searchAIIntelligence(query:string,limit=8){
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!query.trim()) return [];
 try {
  const endpoint=url.replace(/\/$/,'')+'/functions/v1/calcora-ai-intelligence-search';
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({query:query.slice(0,2000),limit})});
  if(!response.ok) return [];
  const data=await response.json();
  return Array.isArray(data.matches)?data.matches:[];
 } catch { return []; }
}
