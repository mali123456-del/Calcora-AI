import type { KnowledgeSourceMetadata } from './types';

export type MathDatasetUsage = 'ingestion-candidate' | 'reference-only' | 'provider-api-only';

export interface MathDatasetSource {
  id: string;
  name: string;
  url: string;
  usage: MathDatasetUsage;
  source: KnowledgeSourceMetadata;
  domains: string[];
  notes: string;
}

export const MATH_DATASET_SOURCES: MathDatasetSource[] = [
  {
    id: 'deepmind-mathematics-dataset',
    name: 'DeepMind Mathematics Dataset',
    url: 'https://github.com/google-deepmind/mathematics_dataset',
    usage: 'ingestion-candidate',
    source: { sourceName: 'DeepMind Mathematics Dataset', sourceType: 'external-dataset', url: 'https://github.com/google-deepmind/mathematics_dataset', licenseOrStatus: 'Reference metadata only; verify repository license/notices before ingestion.' },
    domains: ['arithmetic','algebra','calculus','comparison','probability'],
    notes: 'Generated mathematical problems are useful for deterministic practice generation and validation.',
  },
  {
    id: 'openmathinstruct-2',
    name: 'OpenMathInstruct-2',
    url: 'https://huggingface.co/datasets/nvidia/OpenMathInstruct-2',
    usage: 'ingestion-candidate',
    source: { sourceName: 'OpenMathInstruct-2', sourceType: 'public-domain', url: 'https://huggingface.co/datasets/nvidia/OpenMathInstruct-2', licenseOrStatus: 'CC BY 4.0 per dataset card; preserve attribution and verify component provenance.' },
    domains: ['algebra','calculus','geometry','number theory','competition math'],
    notes: 'Candidate instruction/problem corpus; keep provenance attached to imported records.',
  },
  {
    id: 'numinamath-cot',
    name: 'NuminaMath',
    url: 'https://huggingface.co/datasets/AI-MO/NuminaMath-CoT',
    usage: 'ingestion-candidate',
    source: { sourceName: 'NuminaMath', sourceType: 'public-domain', url: 'https://huggingface.co/datasets/AI-MO/NuminaMath-CoT', licenseOrStatus: 'Apache-2.0 per published dataset metadata; verify component provenance and notices before redistribution.' },
    domains: ['algebra','geometry','calculus','olympiad math'],
    notes: 'Candidate advanced-practice corpus; imported records should be normalized and independently verified.',
  },
  {
    id: 'metamathqa',
    name: 'MetaMathQA',
    url: 'https://huggingface.co/datasets/meta-math/MetaMathQA',
    usage: 'ingestion-candidate',
    source: { sourceName: 'MetaMathQA', sourceType: 'public-domain', url: 'https://huggingface.co/datasets/meta-math/MetaMathQA', licenseOrStatus: 'License/provenance must be checked against the dataset card before ingestion.' },
    domains: ['word problems','algebra','arithmetic','reasoning'],
    notes: 'Useful for paraphrase robustness; do not treat generated answers as authoritative without deterministic checks.',
  },
  {
    id: 'mathinstruct',
    name: 'MathInstruct',
    url: 'https://huggingface.co/datasets/TIGER-Lab/MathInstruct',
    usage: 'ingestion-candidate',
    source: { sourceName: 'MathInstruct', sourceType: 'public-domain', url: 'https://huggingface.co/datasets/TIGER-Lab/MathInstruct', licenseOrStatus: 'License/provenance must be checked against the dataset card before ingestion.' },
    domains: ['instruction following','algebra','calculus','geometry','reasoning'],
    notes: 'Candidate tutoring-style instruction corpus; retain source attribution per record.',
  },
  {
    id: 'openmathreasoning',
    name: 'NVIDIA OpenMathReasoning',
    url: 'https://huggingface.co/datasets/nvidia/OpenMathReasoning',
    usage: 'ingestion-candidate',
    source: { sourceName: 'NVIDIA OpenMathReasoning', sourceType: 'external-dataset', url: 'https://huggingface.co/datasets/nvidia/OpenMathReasoning', licenseOrStatus: 'CC BY 4.0 per dataset card; preserve attribution and review provenance.' },
    domains: ['competition math','proofs','algebra','geometry','probability'],
    notes: 'Candidate corpus with generated solutions and expected answers; deterministic verification should gate records before they become verified.',
  },
  {
    id: 'openwebmath',
    name: 'OpenWebMath',
    url: 'https://huggingface.co/datasets/open-web-math/open-web-math',
    usage: 'reference-only',
    source: { sourceName: 'OpenWebMath', sourceType: 'public-domain', url: 'https://huggingface.co/datasets/open-web-math/open-web-math', licenseOrStatus: 'Reference only until dataset-specific licensing and provenance are verified for the intended use.' },
    domains: ['mathematical text','notation','web math'],
    notes: 'Do not bulk-copy web text into the product. Use provenance-aware sampling only after rights review.',
  },
  {
    id: 'huggingface-datasets-hub',
    name: 'Hugging Face Datasets Hub',
    url: 'https://huggingface.co/datasets',
    usage: 'reference-only',
    source: { sourceName: 'Hugging Face Datasets Hub', sourceType: 'public-domain', url: 'https://huggingface.co/datasets', licenseOrStatus: 'Hub contains datasets with different licenses; each dataset requires separate review.' },
    domains: ['dataset discovery'],
    notes: 'Registry/discovery source, not a blanket license for every dataset hosted there.',
  },
];

export function getIngestionCandidateDatasets(): MathDatasetSource[] {
  return MATH_DATASET_SOURCES.filter((dataset) => dataset.usage === 'ingestion-candidate');
}
