/**
 * RED-first coverage for the capability registry (Phase 23).
 *
 * The directive requires that the UI expose only functionality the application actually
 * supports, and that modes not be labels producing identical behaviour. These tests pin both:
 *
 *  - every registry entry names the concrete evidence that makes it real (an orchestrator
 *    branch, a deterministic tool, a retrieved corpus...), not just a label;
 *  - a mode with no differentiating behaviour cannot be advertised as supported;
 *  - unavailable capabilities are reported as such rather than silently omitted, so the UI
 *    can explain *why* something is missing instead of pretending it does not exist;
 *  - advertised capabilities are a subset of what is actually implemented -- the registry may
 *    never over-claim.
 */

import assert from 'node:assert/strict';
import {
  CAPABILITY_REGISTRY,
  listAvailableCapabilities,
  listPlannedCapabilities,
  isCapabilityAvailable,
  capabilityReport,
  type CapabilityEvidence,
} from '../src/services/capabilityRegistry';

function main() {
  // 1. Every capability declares what makes it real.
  for (const capability of CAPABILITY_REGISTRY) {
    assert.ok(capability.id.length > 0, 'a capability must have an id');
    assert.ok(capability.label.length > 0, `capability ${capability.id} must have a human label`);
    assert.ok(
      capability.evidence.length > 0,
      `capability ${capability.id} must cite at least one piece of implementation evidence`,
    );
    for (const item of capability.evidence) {
      assert.ok(
        (item as CapabilityEvidence).kind.length > 0 && (item as CapabilityEvidence).reference.length > 0,
        `capability ${capability.id} evidence must name a kind and a reference`,
      );
    }
  }

  // 2. Availability requires real differentiating behaviour, not merely being listed.
  for (const capability of CAPABILITY_REGISTRY) {
    if (capability.available) {
      assert.notEqual(
        capability.behaviour,
        'label-only',
        `capability ${capability.id} is advertised as available but declares no differentiating behaviour`,
      );
    }
  }

  // 3. A planned capability is never reported as available.
  for (const capability of CAPABILITY_REGISTRY) {
    if (capability.status !== 'available') {
      assert.equal(
        isCapabilityAvailable(capability.id),
        false,
        `capability ${capability.id} is ${capability.status} and must not be advertised as available`,
      );
    }
  }

  // 4. Availability lookups are honest in both directions.
  assert.equal(isCapabilityAvailable('deterministic-math'), true, 'the deterministic engine is a real capability');
  assert.equal(isCapabilityAvailable('socratic-tutor'), true, 'socratic mode has a real orchestrator branch');
  assert.equal(isCapabilityAvailable('nonexistent-capability'), false, 'an unknown capability is not available');

  // 5. Planned capabilities are visible with a reason, not silently missing.
  const planned = listPlannedCapabilities();
  assert.ok(planned.length > 0, 'the registry must record capabilities that are planned but not available');
  for (const capability of planned) {
    assert.ok(
      capability.unavailableReason && capability.unavailableReason.length > 20,
      `planned capability ${capability.id} must explain why it is not yet available`,
    );
  }

  // 6. The available list never contains a planned capability.
  const availableIds = listAvailableCapabilities().map((c) => c.id);
  for (const capability of planned) {
    assert.equal(
      availableIds.includes(capability.id),
      false,
      `planned capability ${capability.id} must not appear in the available list`,
    );
  }

  // 7. The report is internally consistent: available + planned === total.
  const report = capabilityReport();
  assert.equal(
    report.available.length + report.planned.length,
    CAPABILITY_REGISTRY.length,
    'every capability is either available or planned -- nothing is unaccounted for',
  );
  assert.equal(report.total, CAPABILITY_REGISTRY.length, 'the report total matches the registry');

  // 8. Deterministic authority is stated as a capability, and is never marked as model-dependent.
  const deterministic = CAPABILITY_REGISTRY.find((c) => c.id === 'deterministic-math');
  assert.ok(deterministic, 'the deterministic engine must be declared as a capability');
  assert.equal(deterministic.requiresModel, false, 'deterministic mathematics must never depend on a language model');

  // 9. Every model-dependent capability is explicitly labelled as such, so model retirement can
  // enumerate exactly what breaks. A capability may legitimately be BOTH model-dependent and
  // planned: dependency and build state are independent facts, and conflating them would force
  // either a false "available" or a false "model-independent".
  const modelDependent = CAPABILITY_REGISTRY.filter((c) => c.requiresModel);
  assert.ok(modelDependent.length > 0, 'at least one capability must be flagged model-dependent');
  for (const capability of modelDependent) {
    assert.ok(
      capability.evidence.length > 0,
      `model-dependent capability ${capability.id} must say what provides it`,
    );
  }
  // Deterministic mathematics must never appear in that set.
  assert.equal(
    modelDependent.some((c) => c.id === 'deterministic-math'),
    false,
    'deterministic mathematics must never be listed as model-dependent',
  );
  // A planned capability must explain its gap even when it is model-dependent.
  for (const capability of listPlannedCapabilities()) {
    assert.ok(
      capability.unavailableReason && capability.unavailableReason.length > 20,
      `planned capability ${capability.id} must explain why it is unavailable`,
    );
  }

  console.log('PASS  every capability cites implementation evidence');
  console.log('PASS  an advertised capability must declare differentiating behaviour');
  console.log('PASS  a planned capability is never advertised as available');
  console.log('PASS  availability lookups are honest in both directions');
  console.log('PASS  planned capabilities are visible with a stated reason');
  console.log('PASS  the available list never leaks a planned capability');
  console.log('PASS  available + planned accounts for every registered capability');
  console.log('PASS  deterministic mathematics is declared and never model-dependent');
  console.log('PASS  every model-dependent capability is labelled and justified');
}

main();