import assert from 'node:assert/strict';
import { orchestrateTutor } from '../src/services/tutorOrchestrator';

async function main() {
  console.log('=== RED CONCEPTUAL TUTOR TESTS ===\n');

  // TEST 1: "What is a derivative?" produces a useful conceptual explanation
  console.log('TEST 1: What is a derivative?');
  const test1 = await orchestrateTutor({
    prompt: 'What is a derivative?',
    offlineOnly: true,
  });
  console.log('Answer:', test1.answer.substring(0, 200) + '...');
  console.log('Response source:', test1.responseSource);
  console.log('Grounding sources:', test1.groundingSources);
  console.log('Deterministic available:', test1.deterministicAuthority.isAvailable);
  console.log('Verification state:', test1.deterministicAuthority.verification.state);

  // Check that it's NOT returning the fallback "no deterministic result" message
  const isFallback = test1.answer.includes('No deterministic result could be produced') ||
                     test1.answer.includes('nothing to verify');
  if (isFallback) {
    console.log('❌ FAIL: Returns fallback message instead of conceptual explanation');
  } else {
    console.log('✓ PASS: Does not return fallback message');
  }

  // Check that it mentions derivative-related concepts
  const mentionsDerivative = test1.answer.toLowerCase().includes('derivative') ||
                          test1.answer.toLowerCase().includes('rate of change') ||
                          test1.groundingSources.some(s => s.toLowerCase().includes('derivative'));
  if (mentionsDerivative) {
    console.log('✓ PASS: Mentions derivative concepts');
  } else {
    console.log('❌ FAIL: Does not mention derivative concepts');
  }

  // Check that it does NOT have a fake verification badge
  if (test1.deterministicAuthority.verification.state !== 'VERIFIED') {
    console.log('✓ PASS: No fake VERIFIED badge (state is', test1.deterministicAuthority.verification.state + ')');
  } else {
    console.log('❌ FAIL: Has VERIFIED badge for conceptual question');
  }

  console.log('\n---\n');

  // TEST 2: "What is an integral?" produces a useful conceptual explanation
  console.log('TEST 2: What is an integral?');
  const test2 = await orchestrateTutor({
    prompt: 'What is an integral?',
    offlineOnly: true,
  });
  console.log('Answer:', test2.answer.substring(0, 200) + '...');
  console.log('Response source:', test2.responseSource);
  console.log('Grounding sources:', test2.groundingSources);

  const test2IsFallback = test2.answer.includes('No deterministic result could be produced') ||
                         test2.answer.includes('nothing to verify');
  if (!test2IsFallback) {
    console.log('✓ PASS: Does not return fallback message');
  } else {
    console.log('❌ FAIL: Returns fallback message');
  }

  const mentionsIntegral = test2.answer.toLowerCase().includes('integral') ||
                          test2.answer.toLowerCase().includes('integration') ||
                          test2.groundingSources.some(s => s.toLowerCase().includes('integral'));
  if (mentionsIntegral) {
    console.log('✓ PASS: Mentions integral concepts');
  } else {
    console.log('❌ FAIL: Does not mention integral concepts');
  }

  console.log('\n---\n');

  // TEST 3: "Explain Pythagorean theorem simply"
  console.log('TEST 3: Explain Pythagorean theorem simply');
  const test3 = await orchestrateTutor({
    prompt: 'Explain Pythagorean theorem simply',
    offlineOnly: true,
  });
  console.log('Answer:', test3.answer.substring(0, 200) + '...');
  console.log('Response source:', test3.responseSource);
  console.log('Grounding sources:', test3.groundingSources);

  const test3IsFallback = test3.answer.includes('No deterministic result could be produced') ||
                         test3.answer.includes('nothing to verify');
  if (!test3IsFallback) {
    console.log('✓ PASS: Does not return fallback message');
  } else {
    console.log('❌ FAIL: Returns fallback message');
  }

  const mentionsPythagorean = test3.answer.toLowerCase().includes('pythagorean') ||
                            test3.answer.toLowerCase().includes('a² + b²') ||
                            test3.groundingSources.some(s => s.toLowerCase().includes('pythagorean'));
  if (mentionsPythagorean) {
    console.log('✓ PASS: Mentions Pythagorean theorem');
  } else {
    console.log('❌ FAIL: Does not mention Pythagorean theorem');
  }

  console.log('\n---\n');

  // TEST 4: "Why does x^2 become 2x when differentiated?"
  console.log('TEST 4: Why does x^2 become 2x when differentiated?');
  const test4 = await orchestrateTutor({
    prompt: 'Why does x^2 become 2x when differentiated?',
    offlineOnly: true,
  });
  console.log('Answer:', test4.answer.substring(0, 200) + '...');
  console.log('Response source:', test4.responseSource);
  console.log('Grounding sources:', test4.groundingSources);

  const test4IsFallback = test4.answer.includes('No deterministic result could be produced') ||
                         test4.answer.includes('nothing to verify');
  if (!test4IsFallback) {
    console.log('✓ PASS: Does not return fallback message');
  } else {
    console.log('❌ FAIL: Returns fallback message');
  }

  // This is a mixed request - should explain but may also compute
  const mentionsPowerRule = test4.answer.toLowerCase().includes('power rule') ||
                          test4.answer.toLowerCase().includes('2x');
  if (mentionsPowerRule) {
    console.log('✓ PASS: Mentions power rule or 2x');
  } else {
    console.log('❌ FAIL: Does not mention power rule or 2x');
  }

  console.log('\n---\n');

  // TEST 5: Conceptual question does NOT incorrectly return "No deterministic result available"
  console.log('TEST 5: Generic conceptual question (teach me about functions)');
  const test5 = await orchestrateTutor({
    prompt: 'teach me about functions',
    offlineOnly: true,
  });
  console.log('Answer:', test5.answer.substring(0, 200) + '...');
  console.log('Response source:', test5.responseSource);

  const test5IsFallback = test5.answer.includes('No deterministic result could be produced') ||
                         test5.answer.includes('nothing to verify');
  if (!test5IsFallback) {
    console.log('✓ PASS: Does not return fallback message');
  } else {
    console.log('❌ FAIL: Returns fallback message');
  }

  console.log('\n---\n');

  // TEST 6: Mathematical calculation still routes through deterministic Math Engine
  console.log('TEST 6: Pure calculation (2 + 3)');
  const test6 = await orchestrateTutor({
    prompt: '2 + 3',
    offlineOnly: true,
  });
  console.log('Answer:', test6.answer);
  console.log('Deterministic available:', test6.deterministicAuthority.isAvailable);
  console.log('Verification state:', test6.deterministicAuthority.verification.state);
  console.log('Authoritative result:', test6.deterministicAuthority.authoritativeResult);

  if (test6.deterministicAuthority.isAvailable && test6.deterministicAuthority.authoritativeResult === '5') {
    console.log('✓ PASS: Calculation routed through deterministic engine');
  } else {
    console.log('❌ FAIL: Calculation not routed correctly');
  }

  if (test6.deterministicAuthority.verification.state === 'VERIFIED') {
    console.log('✓ PASS: Calculation is VERIFIED');
  } else {
    console.log('❌ FAIL: Calculation not VERIFIED');
  }

  console.log('\n---\n');

  // TEST 7: Mixed request - calculation + explanation
  console.log('TEST 7: Mixed request (Calculate the derivative of x^2 and explain why)');
  const test7 = await orchestrateTutor({
    prompt: 'Calculate the derivative of x^2 and explain why',
    offlineOnly: true,
  });
  console.log('Answer:', test7.answer.substring(0, 300) + '...');
  console.log('Deterministic available:', test7.deterministicAuthority.isAvailable);
  console.log('Verification state:', test7.deterministicAuthority.verification.state);
  console.log('Authoritative result:', test7.deterministicAuthority.authoritativeResult);

  // Should have deterministic result for the calculation part
  if (test7.deterministicAuthority.isAvailable) {
    console.log('✓ PASS: Deterministic result available for calculation part');
  } else {
    console.log('❌ FAIL: No deterministic result for calculation part');
  }

  // Should mention explanation concepts
  const mentionsExplanation = test7.answer.toLowerCase().includes('explain') ||
                            test7.answer.toLowerCase().includes('power rule') ||
                            test7.answer.toLowerCase().includes('why');
  if (mentionsExplanation) {
    console.log('✓ PASS: Provides explanation');
  } else {
    console.log('❌ FAIL: Does not provide explanation');
  }

  console.log('\n---\n');

  // TEST 8: Check that "explain" intent is properly classified
  console.log('TEST 8: Intent classification for conceptual questions');
  const { classifyMathematicalIntent } = await import('../src/knowledge/mathematics/intent');

  const intent1 = classifyMathematicalIntent('What is a derivative?');
  console.log('Intent for "What is a derivative?":', intent1);
  if (intent1 === 'EXPLAIN_CONCEPT') {
    console.log('✓ PASS: Intent classified as EXPLAIN_CONCEPT');
  } else {
    console.log('❌ FAIL: Intent not classified as EXPLAIN_CONCEPT');
  }

  const intent2 = classifyMathematicalIntent('Why does x^2 become 2x?');
  console.log('Intent for "Why does x^2 become 2x?":', intent2);
  if (intent2 === 'WHY_QUESTION' || intent2 === 'EXPLAIN_CONCEPT') {
    console.log('✓ PASS: Intent classified appropriately');
  } else {
    console.log('❌ FAIL: Intent not classified appropriately');
  }

  console.log('\n=== RED TESTS COMPLETE ===');
}

main().catch((error) => {
  console.error('ERROR:', error);
  process.exit(1);
});
