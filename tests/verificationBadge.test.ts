/**
 * GAP-04b — verification badge tests.
 *
 * The badge is the only place a learner learns whether a result was checked. These
 * tests pin the rules that make it trustworthy:
 *   - a state is always derived, never defaulted to VERIFIED;
 *   - each of the four states renders with distinct text;
 *   - FAILED exposes both sides of the disagreement;
 *   - UNVERIFIED is never worded as though the answer were wrong;
 *   - accessibility semantics are present and state is not colour-only.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveDisplayState } from '../src/components/VerificationBadge';
import { verifyCalculation, verifyConceptual, verifyUnsupported } from '../src/verification/independentVerifier';
import { VERIFICATION_STATES } from '../src/verification/verificationStates';

let passed = 0;
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

function section(name: string): void {
  console.log(`\n--- ${name} ---`);
}

const BADGE_SOURCE = readFileSync(
  join(process.cwd(), 'src', 'components', 'VerificationBadge.tsx'),
  'utf8',
);

section('state resolution never defaults to VERIFIED');
check(
  resolveDisplayState({ hasMathematicalResult: true }).state === 'UNAVAILABLE',
  'a result with no outcome and no boolean resolves to UNAVAILABLE, not VERIFIED',
);
check(
  resolveDisplayState({ hasMathematicalResult: false }).state === 'UNVERIFIED',
  'a response with no mathematical result resolves to UNVERIFIED',
);
check(
  resolveDisplayState({ hasMathematicalResult: true, isVerified: false }).state === 'UNAVAILABLE',
  'an explicit false boolean does not become VERIFIED',
);
const canonical = verifyCalculation('7 * 8', '56');
check(
  resolveDisplayState({ verification: canonical, hasMathematicalResult: true }).state === 'VERIFIED'
    && resolveDisplayState({ verification: canonical, hasMathematicalResult: true }).source === 'canonical',
  'a canonical outcome takes precedence and is marked as canonical in origin',
);
check(
  resolveDisplayState({ hasMathematicalResult: true, isVerified: true }).source === 'derived',
  'a boolean-only state is honestly marked as derived rather than canonical',
);

section('every state is representable');
for (const state of VERIFICATION_STATES) {
  check(BADGE_SOURCE.includes(`${state}:`), `the badge defines presentation for ${state}`);
}

section('the four states are visually and textually distinct');
const LABELS: Record<string, string> = {
  VERIFIED: 'Verified',
  UNVERIFIED: 'Not verified',
  FAILED: 'Verification failed',
  UNAVAILABLE: 'No verified result',
};
for (const [state, label] of Object.entries(LABELS)) {
  check(BADGE_SOURCE.includes(`label: '${label}'`), `${state} renders the text "${label}"`);
}
check(
  new Set(Object.values(LABELS)).size === 4,
  'all four states have distinct text, so state is not conveyed by colour alone',
);

section('accessibility semantics are present');
check(BADGE_SOURCE.includes('aria-label='), 'the badge carries an explicit aria-label');
check(/ariaLabel:\s*'Verification state:/.test(BADGE_SOURCE), 'every state has a spoken description beginning "Verification state:"');
check(BADGE_SOURCE.includes('role="status"'), 'the detail region is a live status region');
check(BADGE_SOURCE.includes('aria-expanded='), 'the disclosure exposes its expanded state');
check(BADGE_SOURCE.includes('aria-controls='), 'the disclosure is associated with its detail region');
check(BADGE_SOURCE.includes('focus-visible:ring-2'), 'keyboard focus is visibly indicated');
check(BADGE_SOURCE.includes("'useState'") || BADGE_SOURCE.includes('useState'), 'the disclosure is interactive');
check(/aria-hidden="true"/.test(BADGE_SOURCE), 'decorative glyphs are hidden from assistive technology');

section('FAILED exposes the comparison');
const failedOutcome = verifyCalculation('7 * 8', '57');
check(failedOutcome.state === 'FAILED', 'the fixture really is FAILED');
check(BADGE_SOURCE.includes('Reported:'), 'the badge shows the reported value');
check(BADGE_SOURCE.includes('Independent check:'), 'the badge shows the independently derived value');
check(
  BADGE_SOURCE.includes('verification.actual') && BADGE_SOURCE.includes('verification.independent'),
  'the badge renders both sides of the outcome rather than a bare failure notice',
);

section('UNVERIFIED is not worded as an error');
const conceptualOutcome = verifyConceptual('What is a derivative?');
check(conceptualOutcome.state === 'UNVERIFIED', 'the fixture really is UNVERIFIED');
const unverifiedReason = conceptualOutcome.reason.toLowerCase();
check(
  !/\bis (wrong|incorrect|invalid)\b/.test(unverifiedReason),
  'the UNVERIFIED reason never asserts the answer is faulty',
);
check(
  /not.{0,40}(verif|check)/.test(unverifiedReason),
  'the UNVERIFIED reason states plainly that it was not checked',
);
const unverifiedBlock = (BADGE_SOURCE.split('UNVERIFIED:')[1] ?? '').split('},')[0] ?? '';
// "incorrect" is allowed only inside an explicit reassurance such as
// "that does not mean it is incorrect". A bare accusation is not.
const incorrectUses = unverifiedBlock.match(/[^.]*\bincorrect\b[^.]*/gi) ?? [];
check(
  incorrectUses.length === 0 || incorrectUses.every((s) => /does not mean|not\b[^.]*incorrect/i.test(s)),
  `the UNVERIFIED copy mentions "incorrect" only to negate it (uses: ${JSON.stringify(incorrectUses)})`,
);

section('UNAVAILABLE explains declining rather than guessing');
const unavailableOutcome = verifyUnsupported('Who won the 1998 football world cup?');
check(unavailableOutcome.state === 'UNAVAILABLE', 'the fixture really is UNAVAILABLE');
check(
  /will not guess|cannot responsibly|could not responsibly/i.test(unavailableOutcome.reason),
  'the UNAVAILABLE reason explains that Calcora declines to guess',
);

section('the component does not hardcode a verified state');
check(
  !/isVerified\s*\?\s*'VERIFIED'\s*:\s*'VERIFIED'/.test(BADGE_SOURCE),
  'no ternary collapses both branches to VERIFIED',
);
check(
  BADGE_SOURCE.includes("?? (isVerified === true ? 'VERIFIED' : 'UNVERIFIED')"),
  'the legacy boolean fallback maps false to UNVERIFIED rather than to VERIFIED',
);
check(
  /UNVERIFIED[\s\S]{0,400}UNAVAILABLE/.test(BADGE_SOURCE.split('const PRESENTATION')[1] ?? ''),
  'UNVERIFIED and UNAVAILABLE are separate presentations, not one shared branch',
);

console.log(`\nVerification badge tests passed: ${passed}, failed: ${failures.length}`);
if (failures.length) {
  for (const f of failures) console.log(`  FAILED: ${f}`);
  process.exit(1);
}
