/** Calcora resource-aware runtime policy. Never claims exact OS RAM; deviceMemory is only a browser estimate. */
export type ResourceTier = 'lean' | 'balanced' | 'full';

export interface ResourcePolicy {
  tier: ResourceTier;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  saveData: boolean;
  reducedMotion: boolean;
  maxConcurrentTasks: number;
  visualizationQuality: 'economy' | 'standard' | 'high';
  reason: string;
}

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function detectResourcePolicy(): ResourcePolicy {
  const nav = typeof navigator !== 'undefined' ? navigator as NavigatorHints : undefined;
  const deviceMemoryGb = typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : undefined;
  const hardwareConcurrency = typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined;
  const saveData = nav?.connection?.saveData === true;
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const constrained = saveData || reducedMotion || (deviceMemoryGb !== undefined && deviceMemoryGb <= 4) || (hardwareConcurrency !== undefined && hardwareConcurrency <= 2);
  const abundant = deviceMemoryGb !== undefined && deviceMemoryGb >= 8 && (hardwareConcurrency === undefined || hardwareConcurrency >= 6);

  if (constrained) {
    return { tier: 'lean', deviceMemoryGb, hardwareConcurrency, saveData, reducedMotion, maxConcurrentTasks: 1, visualizationQuality: 'economy', reason: 'Browser-reported resource hints indicate a constrained device or data-saving preference.' };
  }
  if (abundant) {
    return { tier: 'full', deviceMemoryGb, hardwareConcurrency, saveData, reducedMotion, maxConcurrentTasks: 4, visualizationQuality: 'high', reason: 'Browser-reported resource hints indicate a higher-capacity device.' };
  }
  return { tier: 'balanced', deviceMemoryGb, hardwareConcurrency, saveData, reducedMotion, maxConcurrentTasks: 2, visualizationQuality: 'standard', reason: 'No strong resource constraint was detected; using a balanced budget.' };
}

export function resourcePolicyLabel(policy: ResourcePolicy): string {
  return policy.tier === 'lean' ? 'Lean' : policy.tier === 'full' ? 'Full' : 'Balanced';
}
