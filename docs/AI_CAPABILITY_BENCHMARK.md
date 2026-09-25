# Calcora AI Capability Benchmark

This benchmark is a neutral capability checklist, not a vendor ranking. It is used to keep Calcora's roadmap grounded in observable capabilities from established math solvers, tutor products, general AI assistants, multilingual systems, and developer evaluation platforms.

## Reference capability families

| Reference | Capability to benchmark |
|---|---|
| Wolfram Alpha | deterministic/symbolic computation, calculus, units, statistics |
| Symbolab | step-by-step math workflows, graphing, topic coverage |
| Photomath | camera/worksheet capture and guided solutions |
| Mathway | broad math problem solving and guided steps |
| GeoGebra | graphing, geometry, algebra and interactive math |
| Desmos | high-quality interactive graphing |
| Gauth | multimodal homework assistance and explanations |
| ChatGPT | conversational tutoring, multimodal reasoning, tool use |
| Claude | long-context conversation, explanation and document reasoning |
| Gemini | multimodal conversation and guided learning workflows |
| AI model Arena | real-world comparative evaluation methodology |
| DeepL | multilingual translation and language coverage |
| LanguageTool | multilingual grammar/style checking |
| Hugging Face | multilingual model ecosystem and model evaluation resources |

These references are used for feature discovery and test design. Calcora does not copy proprietary prompts, private conversations, credentials, private training data, or hidden model internals.

## Calcora acceptance matrix

### Math correctness
- Deterministic calculator remains the authority for numeric results.
- Algebra, trigonometry, logarithms, exponentials, combinatorics, roots and statistics require regression coverage.
- Domain errors must be explicit rather than silently coerced.
- Malformed numeric literals must be rejected.
- Precision formatting must not convert Infinity/NaN into a misleading finite display.
- AI explanations must not override a verified deterministic result.

### Tutor behavior
- Natural conversation and follow-up questions retain problem context.
- Romanized text, mixed scripts, typos, slang and code-switching are interpreted when intent is sufficiently clear.
- User-selected language takes precedence over automatic detection.
- Formulas, units, identifiers, URLs and code remain unchanged when language changes.
- Socratic/hint/quiz/challenge/exam modes must not reveal a final answer prematurely.
- Check-my-work mode must distinguish user work from verified calculation.
- Responses should adapt to learning level and requested teaching style.

### Multilingual quality
- Script detection covers Latin, Arabic, Devanagari, Bengali, Gurmukhi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Thai, Lao, Tibetan, Myanmar, Georgian, Armenian, Hebrew, Cyrillic, Greek, CJK, Hiragana/Katakana and Hangul.
- Roman Urdu/Hindi and mixed English are explicit test categories.
- Language switching mid-session must preserve state.
- RTL rendering must be tested separately from LTR rendering.
- Translation/grammar resources are treated as evidence or optional runtime providers, not as permission to scrape proprietary systems.

### Multimodal roadmap
- Typed expressions
- Natural-language math questions
- Image/worksheet input where a configured provider supports it
- Voice input/output where browser/OS support exists
- Copy/export/share/retry/edit/regenerate actions

### Cross-platform
- Web/PWA behavior is the shared baseline.
- Electron desktop packaging targets Windows, macOS and Linux.
- CI verifies the same TypeScript/test/build contract on all three operating systems.
- Native OS integrations must be isolated behind platform-aware adapters.
- No hard-coded Windows-only filesystem assumptions in shared application logic.
- Desktop packaging should be performed on native CI runners for each target.
- Code signing/notarization remains deployment-specific and requires platform credentials; compatibility is not the same as signed distribution.

## Benchmark problem families

Every release should include:
1. 20 arithmetic/precision cases.
2. 20 algebra and equation cases.
3. 20 trigonometry/angle-mode cases.
4. 20 calculus cases.
5. 10 statistics/probability cases.
6. 10 units/currency cases.
7. 20 Tutor dialogue cases.
8. 20 multilingual cases.
9. 10 adversarial malformed-input cases.
10. 10 cross-platform smoke cases.

For each case record:
- input
- expected deterministic result, when applicable
- expected domain/error behavior
- expected response language
- expected tutor mode behavior
- whether an external provider is required
- observed result
- regression status

## Important limitation

A feature comparison does not prove that Calcora is better or worse than another product. External products change frequently and many capabilities depend on plan, model, region, device and provider configuration. The benchmark therefore measures Calcora against explicit behavioral requirements instead of assigning vendor scores.
