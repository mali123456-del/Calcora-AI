import assert from 'node:assert/strict';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';
import type { FunctionalTutorMode } from '../src/services/tutorConversationService';

async function main() {
  console.log('=== TUTOR MODES CONCEPTUAL TESTS ===\n');

  const modes: FunctionalTutorMode[] = [
    'assistant',
    'socratic',
    'step-by-step',
    'quiz',
    'hint',
    'check-work',
  ];

  const conceptualQuestion = 'What is a derivative?';

  for (const mode of modes) {
    console.log(`\nTesting mode: ${mode.toUpperCase()}`);
    const result = await orchestrateTutor({
      prompt: conceptualQuestion,
      mode,
      offlineOnly: true,
    });

    console.log('Response source:', result.responseSource);
    console.log('Deterministic available:', result.deterministicAuthority.isAvailable);
    console.log('Answer preview:', result.answer.substring(0, 150) + '...');

    // Check that it doesn't return the fallback message
    const isFallback = result.answer.includes('No deterministic result could be produced') ||
                       result.answer.includes('nothing to verify');
    if (isFallback) {
      console.log(`❌ FAIL: ${mode} mode returns fallback for conceptual question`);
    } else {
      console.log(`✓ PASS: ${mode} mode handles conceptual question`);
    }

    // Check that conceptual content is present
    const mentionsDerivative = result.answer.toLowerCase().includes('derivative') ||
                            result.groundingSources.some(s => s.toLowerCase().includes('derivative'));
    if (mentionsDerivative) {
      console.log(`✓ PASS: ${mode} mode mentions derivative concepts`);
    } else {
      console.log(`❌ FAIL: ${mode} mode does not mention derivative concepts`);
    }
  }

  // Test with calculation question
  console.log('\n\n=== CALCULATION QUESTION TESTS ===\n');
  const calculationQuestion = '2 + 3';

  for (const mode of modes) {
    console.log(`\nTesting mode: ${mode.toUpperCase()} with calculation`);
    const result = await orchestrateTutor({
      prompt: calculationQuestion,
      mode,
      offlineOnly: true,
    });

    console.log('Deterministic available:', result.deterministicAuthority.isAvailable);
    console.log('Verification state:', result.deterministicAuthority.verification.state);
    console.log('Authoritative result:', result.deterministicAuthority.authoritativeResult);

    if (result.deterministicAuthority.isAvailable && result.deterministicAuthority.authoritativeResult === '5') {
      console.log(`✓ PASS: ${mode} mode routes calculation correctly`);
    } else {
      console.log(`❌ FAIL: ${mode} mode does not route calculation correctly`);
    }
  }

  // Test check-work mode with user answer
  console.log('\n\n=== CHECK-WORK MODE TEST ===\n');
  const checkWorkResult = await orchestrateTutor({
    prompt: '2x + 5 = 15',
    mode: 'check-work',
    userAnswer: 'x = 5',
    offlineOnly: true,
  });

  console.log('Answer:', checkWorkResult.answer.substring(0, 200) + '...');
  console.log('Verification state:', checkWorkResult.deterministicAuthority.verification.state);

  if (checkWorkResult.deterministicAuthority.isAvailable) {
    console.log('✓ PASS: Check-work mode has deterministic result');
  } else {
    console.log('❌ FAIL: Check-work mode missing deterministic result');
  }

  console.log('\n=== TUTOR MODES CONCEPTUAL TESTS COMPLETE ===');
}

main().catch((error) => {
  console.error('ERROR:', error);
  process.exit(1);
});
