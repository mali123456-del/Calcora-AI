# Calcora AI — Local Model Storage Decision (Phase 11)

Date: 2026-10-08
Authority: the master command explicitly authorizes restoring models from Git LFS
for this decision, but forbids blindly restoring all four without classification.

## 1. What actually happened

At the start of this phase the four GGUF files were **absent from the working
tree** (`git status` reported unstaged deletions for all four paths) even though
they are LFS-tracked in the repository. Free disk space had grown to 13.29 GB,
so restoring them was safe and necessary: without at least one model the local AI
surface cannot be exercised at all.

Restored with:

```bash
git lfs pull --include="models/*" --exclude=""    # exit 0
```

**Integrity verified by SHA256 against the manifest** (not assumed from the file
size): all four files match
`docs/CALCORA_LOCAL_GGUF_MODEL_MANIFEST_2026-10-06.txt` exactly, and
`git status -- models` is clean, so the restored bytes are the committed bytes.

| File | Size | SHA256 verification |
|---|---|---|
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 1,066 MB | **MATCH** `6A1A2EB6D15622BF…` |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | 2,007 MB | **MATCH** `626B4A6678B86442…` |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | 1,066 MB | **MATCH** `CC324AF070C2ECBF…` |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | 2,007 MB | **MATCH** `724FB256BEC1FF06…` |

| File | Size | SHA256 (manifest prefix) | Role the product gives it |
|---|---|---|---|
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 1,066 MB | `6A1A2EB6…` | **default fast tutor model** |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | 2,007 MB | `626B4A66…` | quality tier for richer explanations |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | 1,066 MB | `CC324AF0…` | coding/steps help (role: `coding`) |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | 2,007 MB | `724FB256…` | larger coder variant |

Roles are derived automatically from the file name by
`identifyRole()` (a `-coder-` segment ⇒ `coding`, otherwise `general`) and exposed
as `LocalModelOption.role`. Model IDs are derived, not user-supplied:
`gguf-<first 16 hex of sha256(lowercased file name + size)>`, which also means a
renamed or resized file cannot silently impersonate a model.

## 2. Deliberate classification

| Model | Classification | Product role / fallback |
|---|---|---|
| `qwen2.5-1.5b-instruct-q4_k_m.gguf` | **Required** | Default local Tutor model. Fastest on CPU (measured ~11 s for a derivative explanation), and the model used for the real-generation proofs. Without it, local AI has no default. |
| `Qwen2.5-3B-Instruct-Q4_K_M.gguf` | **Optional** | Quality tier. Selected by the user when explanation quality matters more than latency. The product remains fully functional without it (1.5B is the default; the deterministic Tutor answers math either way). |
| `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` | **Optional** | Coding-specific help for step explanations and code-adjacent questions. Not part of the mathematical guarantee. |
| `Qwen2.5-Coder-3B-Instruct-Q4_K_M.gguf` | **Duplicate (dev-only)** | Functionally overlaps `qwen2.5-coder-1.5b…` with more parameters but slower CPU inference. Retained in the repository for parity experiments; **no product surface requires it**, and nothing in the UI, agent or tests names it. It is the first file to drop if repository or download size must be reduced. |

None of the four is **Unnecessary**: each has a named role or a documented
development purpose, and each is listed by the model selector with its role and
size. None is silently present-but-unreachable — the earlier duplicate-ID defect
in the *knowledge* corpus showed why silent duplicates are a real risk.

## 3. Storage rules (what is and is not shipped)

* **Not packaged.** `build.files` ships only `dist`, `dist-electron`,
  `package.json` and `node_modules`. The 6 GB of weights never enters an
  installer or an AppImage/dmg; the packaged smoke test asserts no `.gguf`
  exists inside `release/win-unpacked/resources`.
* **Git LFS, not plain git.** The four files are LFS objects; a fresh clone runs
  `git lfs pull --include="models/*"` (or the app runs with no models at all).
* **Runtime resolution is per platform** — `CALCORA_LLAMA_CLI_PATH` wins,
  otherwise well-known locations are probed
  (`<home>/calcora-tools/llama.cpp`, `%LOCALAPPDATA%/calcora-tools/llama.cpp`,
  `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, …). See
  `docs/CROSS_PLATFORM_RUNTIME.md` §3.
* **No model is required for correctness.** Every mathematical answer is produced
  and re-derived by the deterministic engine; the local model only writes prose
  around an already-verified result. With no models and no runtime, the Tutor
  degrades to the deterministic path and says so in the UI (`local runtime
  diagnostic`), rather than pretending AI is present.

## 4. Disk budget

| Item | Size |
|---|---|
| Restored models (4) | 6,146 MB |
| Free disk before restore | 13.29 GB |
| Electron packaging headroom (nsis + portable + unpacked) | ≈ 1.5–2 GB |
| `models/` in the packaged app | 0 MB |

Packaging therefore has enough headroom **only because** the weights stay outside
the build inputs. Any future "bundle the model with the app" idea is rejected for
this reason (also recorded in `docs/TECH_EVALUATION_2026-10-08.md` §4).
