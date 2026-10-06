export type LocalModelRole = 'general' | 'coding';

export interface LocalModelOption {
  /** Opaque, deterministic identifier. Never a path or CLI argument. */
  id: string;
  fileName: string;
  sizeBytes: number;
  role: LocalModelRole;
}

export interface LocalModelStatus {
  runtime: 'llama.cpp' | 'none';
  runtimeAvailable: boolean;
  modelsDirectoryAvailable: boolean;
  models: LocalModelOption[];
  diagnostic?: string;
}

export interface LocalModelGenerationRequest {
  modelId: string;
  systemPrompt: string;
  prompt: string;
}
