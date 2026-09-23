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

  // AI Math Assistant endpoint
  app.post('/api/ai/math', async (req, res) => {
    try {
      const { prompt, conversation = [], currentExpression, currentResult } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        // Fallback response when API key is not yet configured by the user
        return res.json({
          success: true,
          isOfflineFallback: true,
          answer: `AI Math Assistant is ready. To enable live Gemini responses, ensure your GEMINI_API_KEY is configured in Settings > Secrets.\n\nQuery received: "${prompt}".\n\nTip: You can use the deterministic calculator, equation solver, unit converter, and financial tools directly!`,
          steps: [
            'Input parsed safely.',
            'Deterministic calculations remain 100% active and precise.'
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

      const systemInstruction = `You are the AI Mathematical Assistant inside a precision digital scientific calculator.
Your job is to assist with mathematical concepts, solve equations, explain calculations step-by-step, explain formulas, and translate natural language math problems into precise mathematical expressions.

Rules:
1. Provide concise, clear, and mathematically accurate explanations.
2. Structure step-by-step derivations clearly with numbered steps.
3. Whenever presenting mathematical formulas, variables, and expressions in "answer" and "steps", format them using LaTeX math syntax enclosed in dollar signs for inline math (e.g. $x^2 + 5x + 6 = 0$, $\\sqrt{b^2 - 4ac}$, $\\frac{a}{b}$) or double dollar signs for display equations ($$...$$).
4. Whenever extracting an expression to calculate, provide it in the "expression" field in calculator format so the deterministic engine can evaluate it (e.g. "15 * 850 / 100").
5. Keep tone professional, encouraging, and mathematically rigorous.
6. If asked about formulas (e.g. Pythagorean theorem, compound interest, quadratic formula), state the formula clearly in LaTeX ($a^2 + b^2 = c^2$) and give a brief example.
7. Current calculator context if relevant:
   Expression: ${currentExpression || 'None'}
   Result: ${currentResult || 'None'}

Return your response in clean JSON matching:
{
  "answer": "Clear summary answer to the user's query with LaTeX math formatting",
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
