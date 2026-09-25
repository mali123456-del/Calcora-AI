import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { extractMathematicalProblem } from './src/engine/problemExtractor';
import {
  toolCalculate,
  toolSolveEquation,
  toolDerivative,
  toolIntegrate,
  toolLimit,
  toolStatistics,
  toolMatrix,
  executeMathTool,
  MathToolResult,
  ToolResult,
} from './src/engine/toolLayer';
import { getLanguageTemplate, getLanguageSystemInstruction } from './src/knowledge/multilingualTutor';
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

  // Server-Side Math Tool Execution Layer (Deterministic Tool Execution API)
  app.post('/api/math/tool', (req, res) => {
    try {
      const { tool, params = {} } = req.body;
      if (!tool || typeof tool !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Tool name is required (e.g., calculate, solveEquation, solveSystem, derivative, integrate, limit, statistics, matrixOperation, unitConversion, retrieveKnowledge)',
        });
      }

      const toolResult: MathToolResult = executeMathTool(tool, params);
      return res.json(toolResult);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        toolName: req.body?.tool || 'unknown',
        error: err?.message || 'Server-side deterministic tool execution failed',
      });
    }
  });

  // Tutor Orchestration Endpoint
  app.post('/api/tutor/orchestrate', async (req, res) => {
    try {
      const { orchestrateTutor } = await import('./src/services/tutorOrchestrator');
      const result = await orchestrateTutor(req.body);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Tutor orchestration failed',
      });
    }
  });

  // Tutor Real Evaluation Pipeline Endpoint
  app.post('/api/tutor/evaluate', async (req, res) => {
    try {
      const { runRealTutorEvaluationSuite, checkSupabaseCredentials } = await import(
        './src/services/tutorLearningEngine'
      );
      const credStatus = checkSupabaseCredentials();
      if (!credStatus.configured) {
        return res.status(503).json({
          success: false,
          error: 'STOP CONDITION: Missing Supabase production credentials',
          missingVariables: credStatus.missingVariables,
          message: `Evaluation pipeline requires: ${credStatus.missingVariables.join(', ')}`,
        });
      }

      const result = await runRealTutorEvaluationSuite(req.body);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Evaluation run failed',
      });
    }
  });

  // AI Math Assistant & Tutor endpoint
  app.post('/api/ai/math', async (req, res) => {
    try {
      const {
        prompt,
        conversation = [],
        currentExpression,
        currentResult,
        mode,
        tutorMode = 'assistant',
        learningObjective = 'concept',
        difficulty = 'intermediate',
        topic = 'Algebra',
        hintLevel = 1,
        socraticMode = false,
        groundingContext = '',
        language = 'en',
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const { orchestrateTutor } = await import('./src/services/tutorOrchestrator');
      const resolvedMode =
        mode ||
        (socraticMode || tutorMode === 'socratic'
          ? 'socratic'
          : tutorMode === 'solver-review'
          ? 'step-by-step'
          : tutorMode === 'quiz'
          ? 'quiz'
          : 'explain');

      const result = await orchestrateTutor({
        prompt,
        topic,
        difficulty,
        learningObjective,
        hintLevel,
        socraticMode: resolvedMode === 'socratic',
        mode: resolvedMode,
        language,
        currentExpression,
        currentResult,
        conversation,
        groundingContext,
      });

      return res.json({
        success: result.success,
        answer: result.answer,
        expression: result.expression,
        steps: result.steps,
        formula: result.formula,
        mode: result.mode,
        isVerified: result.deterministicAuthority.isVerified,
        verificationNote: result.deterministicAuthority.isVerified
          ? `Verified by Deterministic Math Engine (result = ${result.deterministicAuthority.authoritativeResult})`
          : undefined,
        result: result.deterministicAuthority.authoritativeResult,
        isOfflineFallback: result.isOfflineFallback,
        quizItem: result.quizItem,
        pedagogy: result.pedagogy,
        groundingSources: result.groundingSources,
        executionTimeMs: result.executionTimeMs,
      });
    } catch (error: any) {
      console.error('AI Math endpoint error:', error);
      return res.status(500).json({
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
