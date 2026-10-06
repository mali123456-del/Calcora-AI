/** Privacy boundary for Calcora AI. Private/Offline mode must never fall back to a cloud AI endpoint. */
export type PrivacyMode = 'cloud' | 'private' | 'offline';

export interface LocalProviderStatus { configured:boolean; endpoint:null; provider:'llama.cpp'|'none'; }
export interface OfflinePolicy { mode:PrivacyMode; allowCloudAI:boolean; allowLocalAI:boolean; failClosed:boolean; label:string; }

export function getOfflinePolicy(mode:PrivacyMode='cloud'):OfflinePolicy{
  if(mode==='private'||mode==='offline') return {mode,allowCloudAI:false,allowLocalAI:true,failClosed:true,label:mode==='offline'?'Offline · local only':'Private · local only'};
  return {mode:'cloud',allowCloudAI:true,allowLocalAI:true,failClosed:false,label:'Cloud · consented providers'};
}

export function getLocalProviderStatus():LocalProviderStatus{
  // Inference is proxied through Calcora's own API. The browser does not call a
  // provider endpoint directly, which keeps model routing inside the privacy boundary.
  return {configured:false,endpoint:null,provider:'none'};
}

export function localAIEndpointAvailable():boolean{return getLocalProviderStatus().configured;}

export function assertPrivacyBoundary(mode:PrivacyMode):void{
  if((mode==='private'||mode==='offline') && getOfflinePolicy(mode).allowCloudAI) throw new Error('Privacy boundary violation: cloud AI must remain disabled.');
}
