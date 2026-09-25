export type ProvenanceKind='input'|'parse'|'compute'|'verify'|'explain'|'source';
export interface ProvenanceNode{id:string;kind:ProvenanceKind;label:string;detail?:string;timestamp:number;}
export interface ProvenanceGraph{nodes:ProvenanceNode[];verified:boolean;summary:string;}

export function buildProvenance(expression:string,result:string,verified:boolean,verificationNote:string):ProvenanceGraph{
  const now=Date.now();
  const nodes:ProvenanceNode[]=[
    {id:'input',kind:'input',label:'User input',detail:expression,timestamp:now},
    {id:'parse',kind:'parse',label:'Deterministic parse',detail:'Expression parsed without eval()',timestamp:now},
    {id:'compute',kind:'compute',label:'Deterministic computation',detail:result,timestamp:now},
    {id:'verify',kind:'verify',label:verified?'Verification passed':'Verification unavailable',detail:verificationNote,timestamp:now},
  ];
  return {nodes,verified,summary:verified?'Result has an independent deterministic verification step.':'Result is not independently verified.'};
}
