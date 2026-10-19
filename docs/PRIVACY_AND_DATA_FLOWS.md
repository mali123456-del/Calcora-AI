# Phase 3E: Privacy Policy, Data Flows & Retention Architecture

## 1. Overview and Privacy Guarantees

Calcora AI enforces an ephemeral-by-default architecture where mathematical problem solving, document extraction, and private queries remain confidential and localized.

## 2. Data Flow Matrix

| Data Category | Storage Location | Retention Lifetime | External Network Exposure |
|---|---|---|---|
| **Uploaded Documents** (PDF, XLSX, CSV, DOCX) | RAM only (in-process Map) | Active browser/server session; purged on explicit delete or `/api/privacy/purge` | **Zero** in `local-only` mode; strictly local parsing |
| **Document Search Index** | RAM only (inverted index) | Discarded on document deletion | **Zero**; strictly local lexical search |
| **Calculation History** | LocalStorage in browser | User controlled; cleared via Clear History button | **Zero** |
| **GGUF Model Weights** | Local `models/` directory | User controlled | Fully offline; zero outbound telemetry |
| **Web Research Caches** | RAM only | 1 hour TTL | Only public URLs; internal network destinations blocked |
| **API Keys & Credentials** | Environment variables | Process lifetime | Never echoed to frontend or printed in plain text logs |

## 3. Data Invalidation and Purge Contract

Calling the purge endpoint `POST /api/privacy/purge`:
1. Erases all indexed documents from the `DocumentIntelligenceService`.
2. Empties all chunk arrays and tabular statistical summaries from memory.
3. Clears all cached web search responses in `ControlledWebResearcher`.
4. Records an audit entry verifying the time and quantity of purged items.

## 4. Prompt Injection & Exfiltration Defenses

Retrieved document text, web snippets, and user queries are treated as untrusted data:
1. **Structural Sanitization:** Code fences mimicking system directives (` ```system `, `[SYSTEM: OVERRIDE]`) are disarmed to plain text blocks before feeding into prompts.
2. **Exfiltration Pattern Filtering:** Detection heuristics inspect inputs for suspicious URLs containing `webhook`, `leak`, `collect`, or shell exfiltration attempts (`curl -d password ...`).
3. **Log Masking:** All server logs pass through `sanitizeLogString`, replacing Google API keys, OpenAI keys, Bearer tokens, and password fields with `[REDACTED_SECRET]`.
