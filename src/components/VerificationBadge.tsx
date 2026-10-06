/**
 * Calcora AI — verification badge.
 *
 * Renders the canonical four-state verification outcome on a Tutor or Solver answer.
 *
 * Design rules this component enforces:
 *   - The state comes from the application. It is never defaulted to VERIFIED, and it
 *     is never inferred from the presence of a number in the answer.
 *   - State is conveyed by text first. Colour is a secondary cue only, so the badge
 *     is readable without colour perception, and it carries an ARIA label plus a
 *     `role="status"` live region so a screen reader announces a state change.
 *   - FAILED shows both sides of the disagreement, because "verification failed" is
 *     useless to a learner without knowing what disagreed with what.
 *   - UNVERIFIED and UNAVAILABLE are explicitly distinguished: "we did not check this"
 *     is not the same message as "we cannot produce a checked result here".
 *   - The wording never blames the learner. It describes the system's state.
 */

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, ShieldOff } from 'lucide-react';
import type { VerificationOutcome, VerificationState } from '../verification/verificationStates';

interface VerificationBadgeProps {
  verification?: VerificationOutcome | null;
  /** Legacy boolean, used only when no canonical outcome is available. */
  isVerified?: boolean;
  /** Optional legacy free-text note. */
  verificationNote?: string;
  className?: string;
}

interface StatePresentation {
  label: string;
  /** Spoken/assistive description. Must not rely on colour. */
  ariaLabel: string;
  icon: typeof CheckCircle2;
  container: string;
  iconClass: string;
}

const PRESENTATION: Record<VerificationState, StatePresentation> = {
  VERIFIED: {
    label: 'Verified',
    ariaLabel: 'Verification state: verified. An independent second calculation reproduced this result.',
    icon: CheckCircle2,
    container: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  UNVERIFIED: {
    label: 'Not verified',
    ariaLabel: 'Verification state: not verified. This response was not checked against an independent calculation. That does not mean it is incorrect.',
    icon: CircleHelp,
    container: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-400/30',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  FAILED: {
    label: 'Verification failed',
    ariaLabel: 'Verification state: failed. An independent calculation disagreed with the reported result.',
    icon: AlertTriangle,
    container: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/40',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
  UNAVAILABLE: {
    label: 'No verified result',
    ariaLabel: 'Verification state: unavailable. Calcora could not responsibly produce a verified mathematical result for this request.',
    icon: ShieldOff,
    container: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/40',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
};

export default function VerificationBadge({
  verification,
  isVerified,
  verificationNote,
  className = '',
}: VerificationBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  // A canonical outcome always wins. The boolean is a legacy fallback only, and it is
  // mapped to UNVERIFIED rather than to VERIFIED so a missing outcome can never
  // present itself as confirmed.
  const state: VerificationState = verification?.state
    ?? (isVerified === true ? 'VERIFIED' : 'UNVERIFIED');

  const presentation = PRESENTATION[state];
  const Icon = presentation.icon;
  const reason = verification?.reason || verificationNote;
  const hasDetail = Boolean(reason) || state === 'FAILED';
  const detailId = `calcora-verification-detail-${state.toLowerCase()}`;

  return (
    <div className={`flex flex-col gap-1 ${className}`.trim()}>
      <button
        type="button"
        data-verification-state={state}
        data-verification-method={verification?.method ?? 'none'}
        onClick={() => hasDetail && setExpanded((v) => !v)}
        aria-expanded={hasDetail ? expanded : undefined}
        aria-controls={hasDetail ? detailId : undefined}
        aria-label={presentation.ariaLabel}
        title={hasDetail ? (expanded ? 'Hide verification detail' : 'Show verification detail') : presentation.ariaLabel}
        className={`self-start inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full font-semibold ${presentation.container} ${
          hasDetail ? 'cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-cyan-500' : 'cursor-default'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 shrink-0 ${presentation.iconClass}`} aria-hidden="true" />
        <span>{presentation.label}</span>
        {hasDetail && (
          <span className="text-[10px] font-normal opacity-80" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </button>

      {hasDetail && expanded && (
        <div
          id={detailId}
          role="status"
          className="text-[11px] leading-relaxed rounded-md border border-slate-400/25 bg-slate-500/5 px-2 py-1.5 text-slate-700 dark:text-slate-300 max-w-prose"
        >
          {reason && <p className="m-0">{reason}</p>}

          {state === 'FAILED' && verification && (
            <dl className="m-0 mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[11px]">
              <dt className="font-sans font-semibold">Reported:</dt>
              <dd className="m-0 break-words">{verification.actual ?? '—'}</dd>
              <dt className="font-sans font-semibold">Independent check:</dt>
              <dd className="m-0 break-words">{verification.independent ?? '—'}</dd>
            </dl>
          )}

          {verification && verification.method !== 'none' && (
            <p className="m-0 mt-1 opacity-75">
              Check performed by: <span className="font-mono">{verification.method}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Decide the state for an answer that may not have gone through verification.
 *
 * Used to guarantee that no mathematical answer renders without an explicit state.
 * Anything without a confirmed outcome is surfaced as UNAVAILABLE rather than
 * silently omitted, because an absent badge reads as "nothing to report" and would
 * let an unverified number look identical to a checked one.
 */
export function resolveDisplayState(input: {
  verification?: VerificationOutcome | null;
  isVerified?: boolean;
  hasMathematicalResult: boolean;
}): { state: VerificationState; source: 'canonical' | 'derived' } {
  if (input.verification?.state) return { state: input.verification.state, source: 'canonical' };
  if (!input.hasMathematicalResult) return { state: 'UNVERIFIED', source: 'derived' };
  if (input.isVerified === true) return { state: 'VERIFIED', source: 'derived' };
  return { state: 'UNAVAILABLE', source: 'derived' };
}
