import type { KnowledgeSourceMetadata } from './types';

export const MATHEMATICS_SOURCE_CATALOG: KnowledgeSourceMetadata[] = [
  {
    sourceName: 'OpenStax Mathematics',
    sourceType: 'open-textbook',
    url: 'https://openstax.org/k12/math',
    licenseOrStatus: 'Openly licensed educational textbooks; verify the individual title license/attribution requirements before redistribution.',
  },
  {
    sourceName: 'OpenStax College Algebra',
    sourceType: 'open-textbook',
    url: 'https://openstax.org/books/college-algebra/pages/preface',
    licenseOrStatus: 'CC BY educational textbook; use original summaries and attribution rather than copying textbook passages.',
  },
  {
    sourceName: 'OpenStax Introductory Statistics',
    sourceType: 'open-textbook',
    url: 'https://openstax.org/books/introductory-statistics/pages/preface',
    licenseOrStatus: 'OpenStax educational resource; original summaries are stored in Calcora rather than copied textbook text.',
  },
  {
    sourceName: 'NIST Digital Library of Mathematical Functions',
    sourceType: 'public-domain',
    url: 'https://dlmf.nist.gov/',
    licenseOrStatus: 'Government mathematical reference; Calcora stores original normalized summaries, formulas, metadata, and links.',
  },
  {
    sourceName: 'SymPy Documentation',
    sourceType: 'university',
    url: 'https://docs.sympy.org/latest/',
    licenseOrStatus: 'Open-source symbolic mathematics reference; Calcora uses independently written summaries of documented capabilities.',
  },
  {
    sourceName: 'SageMath Documentation',
    sourceType: 'university',
    url: 'https://doc.sagemath.org/',
    licenseOrStatus: 'Open-source mathematics software documentation; Calcora uses independently written summaries and does not copy documentation text.',
  },
  {
    sourceName: 'Wolfram MathWorld',
    sourceType: 'original-summary',
    url: 'https://mathworld.wolfram.com/',
    licenseOrStatus: 'Reference index only; Calcora does not copy MathWorld articles or proprietary text. Concepts are independently summarized and verified.',
  },

  {
    sourceName: 'Wolfram|Alpha',
    sourceType: 'original-summary',
    url: 'https://www.wolframalpha.com/',
    licenseOrStatus: 'Computational reference only; do not scrape, cache, redistribute results, or use service data as an AI training dataset. Use provider-approved APIs/terms when integrating.',
  },
  {
    sourceName: 'Julius AI',
    sourceType: 'original-summary',
    url: 'https://julius.ai/',
    licenseOrStatus: 'AI data-analysis tool reference; use provider terms and user-owned data. Calcora stores original capability summaries, not scraped answers.',
  },
  {
    sourceName: 'Mathpix',
    sourceType: 'original-summary',
    url: 'https://mathpix.com/',
    licenseOrStatus: 'OCR/LaTeX capability reference; automated extraction and reuse must follow provider terms.',
  },
  {
    sourceName: 'Microsoft Math Solver',
    sourceType: 'original-summary',
    url: 'https://math.microsoft.com/',
    licenseOrStatus: 'Solver capability reference; Calcora does not bulk-copy solution content.',
  },
  {
    sourceName: 'Symbolab',
    sourceType: 'original-summary',
    url: 'https://www.symbolab.com/',
    licenseOrStatus: 'Solver capability reference; use only provider-permitted access and independently authored summaries.',
  },
  {
    sourceName: 'GeoGebra',
    sourceType: 'original-summary',
    url: 'https://www.geogebra.org/',
    licenseOrStatus: 'Graphing capability reference; materials/software have license and attribution requirements that must be respected.',
  },
  {
    sourceName: 'Mathway',
    sourceType: 'original-summary',
    url: 'https://www.mathway.com/',
    licenseOrStatus: 'Solver capability reference; no answer scraping or copied solution corpus.',
  },
  {
    sourceName: 'Desmos',
    sourceType: 'original-summary',
    url: 'https://www.desmos.com/',
    licenseOrStatus: 'Graphing capability reference; Calcora uses independently authored mathematical summaries.',
  },
  {
    sourceName: 'Photomath',
    sourceType: 'original-summary',
    url: 'https://photomath.com/',
    licenseOrStatus: 'Visual-solving capability reference; no copied solution corpus.',
  },
  {
    sourceName: 'Gauth',
    sourceType: 'original-summary',
    url: 'https://www.gauthmath.com/',
    licenseOrStatus: 'AI tutoring capability reference; no copied chatbot or answer-bank content.',
  },
  {
    sourceName: 'Thetawise',
    sourceType: 'original-summary',
    url: 'https://thetawise.ai/',
    licenseOrStatus: 'Tutor UX/Socratic capability reference; Calcora stores independently authored tutoring behavior.',
  },
  {
    sourceName: 'Hugging Face Datasets',
    sourceType: 'public-domain',
    url: 'https://huggingface.co/datasets',
    licenseOrStatus: 'Dataset index; each individual dataset license must be checked before ingestion, redistribution, or training use.',
  },
  {
    sourceName: 'DeepMind Mathematics Dataset',
    sourceType: 'public-domain',
    url: 'https://github.com/google-deepmind/mathematics_dataset',
    licenseOrStatus: 'Open-source generated mathematics dataset; verify repository license and retain required attribution/notices when ingesting.',
  },
  {
    sourceName: 'OpenMathInstruct',
    sourceType: 'public-domain',
    url: 'https://huggingface.co/datasets/nvidia/OpenMathInstruct-2',
    licenseOrStatus: 'Dataset reference; verify the dataset card license and terms before redistribution or model training.',
  },
  {
    sourceName: 'NuminaMath',
    sourceType: 'public-domain',
    url: 'https://huggingface.co/datasets/AI-MO/NuminaMath-CoT',
    licenseOrStatus: 'Dataset reference; verify the dataset card license and source-specific restrictions before ingestion.',
  },
  {
    sourceName: 'MetaMathQA',
    sourceType: 'public-domain',
    url: 'https://huggingface.co/datasets/meta-math/MetaMathQA',
    licenseOrStatus: 'Dataset reference; verify the dataset card license and provenance before ingestion.',
  },
  {
    sourceName: 'MathInstruct',
    sourceType: 'public-domain',
    url: 'https://huggingface.co/datasets/TIGER-Lab/MathInstruct',
    licenseOrStatus: 'Dataset reference; verify the dataset card license and component provenance before ingestion.',
  },
  {
    sourceName: 'OpenWebMath',
    sourceType: 'public-domain',
    url: 'https://huggingface.co/datasets/open-web-math/open-web-math',
    licenseOrStatus: 'Dataset reference only; inspect dataset-specific license/provenance before using any records.',
  },
  {
    sourceName: 'OEIS',
    sourceType: 'public-domain',
    url: 'https://oeis.org/',
    licenseOrStatus: 'OEIS content is provided under CC BY-SA 4.0 subject to its EULA; attribution and share-alike obligations apply to covered reuse.',
  },
];

export const MATHEMATICS_DATA_POLICY = {
  strategy: 'retrieval-grounded-original-summaries',
  purpose: 'Improve mathematical coverage without copying conversational transcripts or copyrighted answer banks.',
  trainingMeaning: 'This is a curated local knowledge/training-example corpus used for retrieval and prompting; it is not base-model fine-tuning.',
  verification: [
    'Numerical answers must pass the deterministic calculator engine when representable.',
    'Supported equations should pass the deterministic equation solver.',
    'Knowledge entries carry assumptions, restrictions, examples, and common mistakes where applicable.',
    'External references are attribution/navigation metadata, not executable instructions.',
  ],
} as const;
