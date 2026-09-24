import { MathKnowledgeItem } from '../knowledgeTypes';

export const statisticsProbabilityKnowledge: MathKnowledgeItem[] = [
  {
    id: 'stat-measures-central-dispersion',
    topic: 'Statistics',
    subtopic: 'Descriptive Statistics',
    level: 'beginner',
    concept: 'Measures of Central Tendency and Dispersion',
    definition:
      'Central tendency describes the central location of data via Mean (arithmetic average), Median (middle value), and Mode (most frequent value). Dispersion measures the variability or spread via Variance and Standard Deviation.',
    notation: '\\bar{x} = \\text{sample mean}, \\quad s = \\text{sample std dev}, \\quad \\sigma = \\text{population std dev}',
    formulas: [
      '\\bar{x} = \\frac{1}{n} \\sum_{i=1}^n x_i',
      's^2 = \\frac{1}{n - 1} \\sum_{i=1}^n (x_i - \\bar{x})^2 \\quad (\\text{Sample Variance - Bessel\'s Correction})',
      's = \\sqrt{s^2}',
      'z = \\frac{x - \\mu}{\\sigma} \\quad (\\text{Standardized z-score})',
    ],
    assumptions: ['Data values are numerical measurements.'],
    domainRestrictions: ['Sample variance requires n >= 2 (division by n - 1).', 'Standard deviation s >= 0 always.'],
    examples: [
      {
        problem: 'Find the mean and sample standard deviation of {2, 4, 4, 4, 5, 5, 7, 9}',
        solution: 'Mean = 5, Sample variance = 4.571, Sample std dev = 2.138',
        steps: [
          'Sum = 2 + 4 + 4 + 4 + 5 + 5 + 7 + 9 = 40, n = 8 -> Mean = 40 / 8 = 5',
          'Squared deviations from 5: (2-5)^2=9, 3*(4-5)^2=3, 2*(5-5)^2=0, (7-5)^2=4, (9-5)^2=16 -> Sum = 32',
          'Sample variance = 32 / (8 - 1) = 32 / 7 =~ 4.571',
          'Sample std dev = sqrt(4.571) =~ 2.138',
        ],
        latex: '\\bar{x} = \\frac{40}{8} = 5, \\quad s = \\sqrt{\\frac{32}{7}} \\approx 2.14',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dividing by n instead of n - 1 when computing sample variance.',
        correction: 'Divide by n - 1 (Bessel\'s correction) for a sample to yield an unbiased estimator of population variance.',
        why: 'Sample deviations around the sample mean underestimate true population variance by a factor of (n-1)/n.',
        preventionTip: 'Check whether your dataset represents a sample (divide by n-1) or the entire population (divide by N).',
      },
    ],
    solutionStrategies: [
      'Sort data to readily find median, mode, min, and max.',
      'Compute sum of items and divide by count for the mean.',
      'Compute sum of squared deviations and divide by n - 1 for sample variance.',
    ],
    relatedTopics: ['normal-distribution', 'linear-regression', 'z-scores', 'hypothesis-testing'],
    prerequisiteTopics: ['arithmetic-averages', 'radicals'],
    keywords: ['mean', 'median', 'mode', 'standard deviation', 'variance', 'z-score', 'dispersion', 'bessel correction'],
    aliases: ['descriptive statistics', 'statistical summary'],
    latexRepresentation: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^n x_i, \\quad s = \\sqrt{\\frac{1}{n-1}\\sum_{i=1}^n (x_i - \\bar{x})^2}',
    sourceMetadata: {
      sourceName: 'Karl Pearson Classical Statistics Foundations',
      sourceType: 'standard_mathematical_definition',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
  {
    id: 'prob-conditional-bayes',
    topic: 'Probability',
    subtopic: 'Conditional Probability and Combinatorics',
    level: 'intermediate',
    concept: 'Conditional Probability, Bayes\' Theorem, and Combinatorics',
    definition:
      'Probability measures the likelihood of events: 0 <= P(A) <= 1. Conditional probability P(A|B) is the likelihood of A given B has occurred. Bayes\' Theorem relates conditional and marginal probabilities. Combinatorics counts unordered selections C(n,k) and ordered arrangements P(n,k).',
    notation: 'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}, \\quad \\binom{n}{k} = \\frac{n!}{k!(n-k)!}',
    formulas: [
      'P(A \\cup B) = P(A) + P(B) - P(A \\cap B) \\quad (\\text{Addition Rule})',
      'P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} \\quad (P(B) > 0)',
      'P(A \\mid B) = \\frac{P(B \\mid A) P(A)}{P(B)} = \\frac{P(B \\mid A) P(A)}{P(B \\mid A)P(A) + P(B \\mid A^c)P(A^c)} \\quad (\\text{Bayes\' Theorem})',
      'P(n, k) = \\frac{n!}{(n - k)!} \\quad (\\text{Permutations})',
      'C(n, k) = \\binom{n}{k} = \\frac{n!}{k!(n - k)!} \\quad (\\text{Combinations})',
      'P(X = k) = \\binom{n}{k} p^k (1 - p)^{n - k} \\quad (\\text{Binomial Exact Probability})',
    ],
    assumptions: ['0 <= P(E) <= 1 for any event E.', 'Sum of probabilities over sample space S equals 1.'],
    domainRestrictions: ['P(B) > 0 in conditional probability denominator.', 'In combinations and permutations, 0 <= k <= n with non-negative integers n, k.'],
    theorems: [
      'Bayes\' Theorem: Relates posterior probability P(A|B) to prior P(A) and likelihood P(B|A).',
      'Law of Total Probability: P(B) = sum P(B|A_i) P(A_i) for a partition {A_i}.',
    ],
    examples: [
      {
        problem: 'How many ways can a committee of 3 be chosen from 7 people?',
        solution: '35',
        steps: [
          'Order does not matter, use combinations C(7, 3)',
          'C(7, 3) = 7! / (3! * 4!) = (7 * 6 * 5) / (3 * 2 * 1) = 210 / 6 = 35',
        ],
        latex: '\\binom{7}{3} = \\frac{7!}{3!4!} = \\frac{7 \\times 6 \\times 5}{3 \\times 2 \\times 1} = 35',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using permutations instead of combinations when order of selection is irrelevant.',
        correction: 'Use combinations C(n,k) when order does not matter; use permutations P(n,k) only when order distinguishes outcomes.',
        why: 'Committees or hands of cards are unordered sets.',
        preventionTip: 'Ask: "Does changing the sequence produce a new outcome?" If no, use combinations.',
      },
      {
        mistake: 'Confusing P(A|B) with P(B|A) (the prosecutor\'s fallacy).',
        correction: 'P(A|B) != P(B|A) in general unless P(A) = P(B). Use Bayes\' theorem to invert conditionality.',
        why: 'The probability of having a disease given a positive test is not equal to the probability of testing positive given the disease.',
        preventionTip: 'Explicitly write out prior probabilities and false positive rates using Bayes\' formula.',
      },
    ],
    solutionStrategies: [
      'Decide whether order matters: permutations (order matters) vs combinations (order does not matter).',
      'For compound events: determine if events are mutually exclusive (disjoint) or independent.',
      'For diagnostic or updated probabilities: set up Bayes\' theorem with tree diagram or formula.',
    ],
    relatedTopics: ['binomial-distribution', 'expected-value', 'permutations-combinations'],
    prerequisiteTopics: ['fractions', 'factorials', 'set-theory'],
    keywords: ['probability', 'conditional probability', 'bayes theorem', 'combinations', 'permutations', 'binomial', 'expected value'],
    aliases: ['probabilistic reasoning', 'combinatorics'],
    latexRepresentation: 'P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B)}, \\quad \\binom{n}{k} = \\frac{n!}{k!(n-k)!}',
    sourceMetadata: {
      sourceName: 'Thomas Bayes An Essay towards solving a Problem in the Doctrine of Chances (1763)',
      sourceType: 'classical_theorem',
      licenseOrStatus: 'public_mathematical_knowledge',
      accessedAt: '2026-09-23',
    },
  },
];
