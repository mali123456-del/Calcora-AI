import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Math Assistant & Tutor endpoint
  app.post('/api/ai/math', async (req, res) => {
    try {
      const {
        prompt,
        conversation = [],
        currentExpression,
        currentResult,
        tutorMode = 'assistant',
        learningObjective = 'concept',
        difficulty = 'intermediate',
        topic = 'Algebra',
        hintLevel = 1,
        socraticMode = false,
        userStep,
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback response when API key is not yet configured by the user
        return res.json({
          success: true,
          isOfflineFallback: true,
          answer: `AI Math Assistant & Tutor is ready. To enable live Gemini responses, ensure your GEMINI_API_KEY is configured in Settings > Secrets.\n\nQuery received: "${prompt}".\n\nTip: You can use the deterministic calculator, equation solver, unit converter, and tutoring tools directly!`,
          steps: [
            'Input parsed safely.',
            'Deterministic calculations remain 100% active and authoritative.'
          ]
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const tutorModeGuidance = tutorMode === 'tutor'
        ? `TUTORING MODE ACTIVE:
- Pedagogical Objective: ${learningObjective}
- Current Topic: ${topic}
- Target Difficulty: ${difficulty} (Adjust vocabulary, mathematical depth, and proof rigor to match this level)
- Progressive Hint Level: ${hintLevel} of 5.
  * Level 1: Conceptual direction only (do not give formulas or answers).
  * Level 2: State the relevant formula, theorem, or identity.
  * Level 3: Show how to substitute known quantities or isolate terms.
  * Level 4: Give the immediate next algebraic step.
  * Level 5: Reveal the complete solution with full derivation.
- Socratic Questioning: ${socraticMode ? 'ENABLED. Ask guided, probing questions to prompt the learner to discover the next step themselves rather than solving it upfront.' : 'DISABLED.'}
- If the user submitted a step to check: "${userStep || 'None'}", analyze whether it is mathematically equivalent, a sign error, or an invalid transformation.`
        : tutorMode === 'solver-review'
        ? `SOLVER REVIEW MODE ACTIVE:
Conduct an in-depth mathematical audit of the problem. Break down the proof step-by-step, verify edge cases, domain restrictions, assumptions, and state all applied axioms.`
        : `STANDARD ASSISTANT MODE ACTIVE: Provide direct, concise answers with step-by-step proofs and LaTeX formulas.`;

      const systemInstruction = `You are the AI Mathematical Assistant & Interactive Tutor inside a precision digital scientific calculator.
You are explaining and tutoring around a deterministic mathematical result. Never alter the verified result.
The deterministic calculator engine is the authoritative source for numerical correctness.

${tutorModeGuidance}

Rules:
1. Provide mathematically rigorous, clear, and encouraging explanations.
2. Structure step-by-step derivations clearly with numbered steps.
3. Whenever presenting mathematical formulas, variables, and expressions in "answer" and "steps", format them using LaTeX math syntax enclosed in dollar signs for inline math (e.g. $x^2 + 5x + 6 = 0$, $\\sqrt{b^2 - 4ac}$, $\\frac{a}{b}$) or double dollar signs for display equations ($$...$$).
4. Whenever extracting an expression to calculate, provide it in the "expression" field in calculator format so the deterministic engine can evaluate it (e.g. "15 * 850 / 100").
5. If in Tutor Mode with Hint Level < 5, do NOT immediately reveal the final answer; guide the user progressively!
6. Current calculator context if relevant:
   Expression: ${currentExpression || 'None'}
   Result: ${currentResult || 'None'}

Return your response in clean JSON matching:
{
  "answer": "Clear response with LaTeX math formatting",
  "expression": "Optional single mathematical expression if applicable (e.g. 15 * 850 / 100 or 2^8), or null",
  "steps": ["Step 1: ... with LaTeX math", "Step 2: ... with LaTeX math"],
  "formula": "Optional standard formula used in LaTeX (e.g. $a^2 + b^2 = c^2$), or null"
}`;

      const historyContext = conversation
        .slice(-4)
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const fullPrompt = historyContext
        ? `${historyContext}\nUser: ${prompt}`
        : prompt;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {
          answer: text,
          steps: [],
          expression: null,
        };
      }

      res.json({
        success: true,
        ...parsed,
      });
    } catch (error: any) {
      console.error('AI Math endpoint error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process AI mathematical query',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Digital AI Scientific Calculator server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
