# Phase 3C: Universal AI Provider and Model Manager

## 1. Overview and Design Principles

Calcora AI Universal Model Manager (`src/services/universalModelManager.ts`) provides a unified, capability-based routing layer over heterogeneous local and cloud inference runtimes.

Its design enforces four core invariants:
1. **Local-Only Fail-Closed:** When privacy mode is `local-only`, requests never touch cloud APIs. If local inference fails, it never falls back silently to external cloud services.
2. **Capability-Based Routing:** Tasks are dispatched according to model specializations (`math-symbolic`, `coding`, `reasoning`, `fast`, `general`).
3. **Zero Secret Leakage:** Provider API keys are masked (`sk-...abcd` / `AIza...1234`) across all endpoints, state inspections, and logs.
4. **Deterministic Priority:** Simple arithmetic and algebraic queries are routed to deterministic TypeScript engines without invoking heavy neural models.

## 2. Supported Provider Adapters

| Provider | Runtime Type | Default Models | Supported Features |
|---|---|---|---|
| **Local Deterministic** | In-process TypeScript | `calcora-deterministic-math` | Exact decimal arithmetic, symbolic equations, calculus, matrices |
| **Local GGUF (llama.cpp)** | Host CLI (`llama-completion` / `llama-cli`) | `qwen2.5-1.5b`, `Qwen2.5-3B`, `qwen2.5-coder` | Fully offline, CPU-parallelized inference, GGUF Q4_K_M quantization |
| **Local Ollama** | Local REST HTTP (`127.0.0.1:11434`) | `qwen2.5-math`, custom local tags | Local streaming, tag inspection |
| **Google Gemini** | Server-side SDK (`@google/genai`) | `gemini-2.5-flash`, `gemini-2.5-pro` | High context window, structured JSON math extraction, multimodal |
| **OpenAI-Compatible** | Standard HTTP `/v1/chat/completions` | Custom configurable endpoints | vLLM, DeepSeek, Groq, OpenRouter, self-hosted API gateways |

## 3. Privacy Modes

1. **`local-only`**:
   - Strictly blocks all outbound network requests to external AI providers.
   - Enforces local GGUF or local deterministic computation.
   - Rejects cloud fallback upon local model errors.
2. **`cloud-allowed`**:
   - Enables configured hosted providers (e.g., Gemini, OpenAI-compatible).
3. **`hybrid`**:
   - Evaluates queries through deterministic engine and local models first; allows cloud escalation only with affirmative user permission.

## 4. Model Health Checks and Diagnostics

The `GET /api/models/registry` endpoint provides real-time health checks, reporting model availability, context limits, and diagnostic instructions (e.g. guidance on how to install llama.cpp or obtain GGUF models) without revealing sensitive paths or unmasked credentials.
