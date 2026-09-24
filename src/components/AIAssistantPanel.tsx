import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { AIMessage } from '../types';
import { askAIMathAssistant, AIResponse } from '../ai/client';
import { sanitizeSpokenMath, sanitizeQueryText } from '../utils/sanitizer';
import {
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeechSynthesisSupported,
} from '../utils/speechSynthesis';
import {
  Sparkles,
  Send,
  CornerDownRight,
  Bot,
  User,
  Trash2,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  AlertCircle,
  CheckCircle,
  Download,
  Copy,
  Check,
  Code2,
  FileText,
  HelpCircle,
  ShieldAlert,
  Zap,
  GitBranch,
  ListOrdered,
  GraduationCap,
  Brain,
  Timer,
  Award,
  BookOpen,
  ArrowRight,
  ChevronRight,
  X,
  Search,
  CheckCircle2,
  Sliders,
  Flame,
} from 'lucide-react';
import {
  extractLaTeXFormula,
  generateConversationMarkdown,
  downloadMarkdownFile,
  copyTextToClipboard,
} from '../utils/aiExport';
import {
  buildQuickPrompt,
  QuickPromptType,
  QUICK_PROMPT_ITEMS,
} from '../utils/aiQuickPrompts';
import {
  TutorMode,
  LearningObjective,
  DifficultyLevel,
  MathTopic,
  HintLevel,
  StepCheckResult,
  MistakeAnalysis,
  TutoringMistakeItem,
  PracticeProblem,
  PracticeSessionState,
  detectMathTopic,
  generateProgressiveHints,
  checkUserStep,
  analyzeMistake,
  generatePracticeProblems,
  evaluatePracticeAnswer,
  HINT_LEVEL_DESCRIPTIONS,
} from '../utils/aiTutor';
import {
  loadSavedMistakes,
  saveMistake,
  dismissMistake,
  clearAllMistakes,
  loadTutorSettings,
  saveTutorSettings,
  loadTutorStats,
  recordPracticeSessionResult,
  TutorStoredStats,
} from '../utils/aiTutorStorage';
import { SUPPORTED_LANGUAGES } from '../knowledge/multilingualTutor';

interface AIAssistantPanelProps {
  currentExpression?: string;
  currentResult?: string;
  onApplyToCalculator?: (expr: string) => void;
}

const ALL_MATH_TOPICS: MathTopic[] = [
  'Arithmetic',
  'Algebra',
  'Geometry',
  'Trigonometry',
  'Calculus',
  'Statistics',
  'Probability',
  'Physics',
  'Engineering',
  'Linear Algebra',
  'Number Theory',
];

const QUICK_PROMPTS = [
  'Explain this step',
  'Check for errors',
  'Simplify expression',
  'Give me a Hint',
  'Ask a Socratic question',
  'What is 15% of 850?',
  'Solve x² + 5x + 6 = 0',
  'Explain the Pythagorean theorem',
];

// Web Speech API interface definitions for TypeScript
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * Normalizes LaTeX delimiters such as \[ \] and \( \) to standard $ and $$ for remark-math
 */
function preprocessLaTeX(content: string): string {
  if (!content) return '';
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
}

/**
 * Custom Markdown and LaTeX renderer component with KaTeX support
 */
export const MathMarkdownRenderer: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  return (
    <div className={`prose dark:prose-invert max-w-none text-xs sm:text-sm font-sans ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-purple-300 dark:text-purple-300 light:text-purple-800">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic text-cyan-300/90">{children}</em>,
          code: ({ children, className }) => (
            <code
              className={`px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 font-mono-math text-xs text-cyan-300 ${
                className || ''
              }`}
            >
              {children}
            </code>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2 space-y-1 marker:text-purple-400">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1 marker:text-cyan-400">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-purple-500 pl-3 italic text-slate-300 my-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {preprocessLaTeX(content)}
      </ReactMarkdown>
    </div>
  );
};

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  currentExpression,
  currentResult,
  onApplyToCalculator,
}) => {
  // Load saved preferences
  const initialSettings = loadTutorSettings();

  const [tutorMode, setTutorMode] = useState<TutorMode>(initialSettings.mode || 'tutor');
  const [learningObjective, setLearningObjective] = useState<LearningObjective>(
    initialSettings.learningObjective || 'concept'
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initialSettings.difficulty || 'intermediate'
  );
  const [selectedTopic, setSelectedTopic] = useState<MathTopic | 'auto'>(
    initialSettings.topicOverride || 'auto'
  );
  const [socraticMode, setSocraticMode] = useState<boolean>(initialSettings.socraticMode ?? true);
  const [examMode, setExamMode] = useState<boolean>(initialSettings.examMode ?? false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Messages state
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to **AI Mathematical Tutor Mode 2.0**! I am designed to guide you through mathematical concepts, verify your individual steps, offer progressive 5-level hints, and deconstruct errors without immediately spoiling complete proofs.\n\nFormulas are rendered in LaTeX ($a^2 + b^2 = c^2$). Use the **Hint** and **Check My Step** tools below to learn actively!',
      formula: 'a^2 + b^2 = c^2',
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Progressive Hint State
  const [hintLevel, setHintLevel] = useState<HintLevel>(1);
  const [activeProblem, setActiveProblem] = useState<string>(
    currentExpression ? `${currentExpression}${currentResult ? ' = ' + currentResult : ''}` : '2x + 5 = 17'
  );
  const [activeHints, setActiveHints] = useState<[string, string, string, string, string]>(() =>
    generateProgressiveHints(activeProblem)
  );

  // Step Checking State
  const [userStepInput, setUserStepInput] = useState('');
  const [stepCheckResult, setStepCheckResult] = useState<StepCheckResult | null>(null);
  const [isCheckingStep, setIsCheckingStep] = useState(false);

  // Mistake Analysis State
  const [activeMistakeAnalysis, setActiveMistakeAnalysis] = useState<MistakeAnalysis | null>(null);
  const [savedMistakes, setSavedMistakes] = useState<TutoringMistakeItem[]>(() => loadSavedMistakes());
  const [showMistakesModal, setShowMistakesModal] = useState(false);
  const [mistakeJustSaved, setMistakeJustSaved] = useState(false);

  // Practice & Exam Session State
  const [practiceSession, setPracticeSession] = useState<PracticeSessionState | null>(null);
  const [practiceAnswerInput, setPracticeAnswerInput] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState<{ isCorrect: boolean; feedback: string } | null>(null);
  const [tutorStats, setTutorStats] = useState<TutorStoredStats>(() => loadTutorStats());

  // Export Conversation & Copy LaTeX States
  const [isExported, setIsExported] = useState(false);
  const [copiedLatexId, setCopiedLatexId] = useState<string | null>(null);
  const [copiedStepId, setCopiedStepId] = useState<string | null>(null);

  // Speech Recognition (Web Speech API input)
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);

  // Text-to-Speech (TTS output)
  const [isTTSSupported, setIsTTSSupported] = useState(true);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isSpeakingPaused, setIsSpeakingPaused] = useState(false);
  const [speakingStepIndex, setSpeakingStepIndex] = useState<number | null>(null);
  const [speechPlaybackRate, setSpeechPlaybackRate] = useState<number>(1.0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Topic detection
  const detectedTopic = detectMathTopic(inputPrompt || activeProblem, currentExpression);
  const effectiveTopic: MathTopic = selectedTopic === 'auto' ? detectedTopic : selectedTopic;

  // Persist settings whenever changed
  useEffect(() => {
    saveTutorSettings({
      mode: tutorMode,
      learningObjective,
      difficulty,
      topicOverride: selectedTopic === 'auto' ? undefined : selectedTopic,
      socraticMode,
      examMode,
    });
  }, [tutorMode, learningObjective, difficulty, selectedTopic, socraticMode, examMode]);

  // Sync active problem if calculator expression updates
  useEffect(() => {
    if (currentExpression && currentExpression.trim()) {
      const p = `${currentExpression}${currentResult ? ' = ' + currentResult : ''}`;
      setActiveProblem(p);
      setActiveHints(generateProgressiveHints(p));
      setHintLevel(1);
      setStepCheckResult(null);
      setActiveMistakeAnalysis(null);
    }
  }, [currentExpression, currentResult]);

  // Practice Timer Hook
  useEffect(() => {
    let timer: any;
    if (practiceSession && practiceSession.isActive && !practiceSession.isFinished) {
      timer = setInterval(() => {
        setPracticeSession((prev) => {
          if (!prev || prev.isFinished) return prev;
          return {
            ...prev,
            elapsedSeconds: prev.elapsedSeconds + 1,
          };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [practiceSession?.isActive, practiceSession?.isFinished]);

  // Check speech recognition & synthesis support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const windowObj = window as unknown as IWindowWithSpeech;
      const SpeechRecognitionClass =
        windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setIsSpeechSupported(false);
      }

      setIsTTSSupported(isSpeechSynthesisSupported());
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, speechStatus, stepCheckResult, activeMistakeAnalysis]);

  // Clean up speech recognition & text-to-speech on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopSpeaking();
    };
  }, []);

  // Send message handler with input sanitization and Tutor parameters
  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputPrompt;
    const sanitized = sanitizeQueryText(rawText);

    if (!sanitized || isLoading) return;

    // Update active problem if the query looks like a problem or equation
    if (sanitized.includes('=') || /[0-9]/.test(sanitized)) {
      setActiveProblem(sanitized);
      setActiveHints(generateProgressiveHints(sanitized));
      setHintLevel(1);
    }

    // Stop listening & active speech if user hits send
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setSpeechStatus(null);
    }
    stopSpeaking();
    setActiveSpeakingId(null);
    setIsSpeakingPaused(false);
    setSpeakingStepIndex(null);

    const userMsg: AIMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: sanitized,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setSpeechError(null);
    setIsLoading(true);

    try {
      const response: AIResponse = await askAIMathAssistant(
        sanitized,
        messages,
        currentExpression,
        currentResult,
        tutorMode === 'tutor' ? 'teach' : 'explain',
        {
          tutorMode,
          learningObjective,
          difficulty,
          topic: effectiveTopic,
          hintLevel,
          socraticMode,
          language: selectedLanguage,
        }
      );

      const assistantMsg: AIMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        expression: response.expression || undefined,
        formula: response.formula || undefined,
        steps: response.steps,
        isVerified: response.isVerified,
        verificationNote: response.verificationNote,
        timestamp: Date.now(),
        knowledgeConceptsUsed: response.knowledgeConceptsUsed,
        isGrounded: response.isGrounded,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      // Sync progressive hints with assistant response steps if present
      if (response.steps && response.steps.length > 0) {
        setActiveHints(generateProgressiveHints(sanitized, response.expression || undefined, response.steps, response.answer));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: 'I encountered an issue processing your mathematical tutoring request. Please try again.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle voice dictation using Web Speech API
  const toggleListening = useCallback(() => {
    setSpeechError(null);

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setSpeechStatus(null);
      return;
    }

    const windowObj = window as unknown as IWindowWithSpeech;
    const SpeechRecognitionClass =
      windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setSpeechStatus('Listening... speak your math question clearly');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const sanitized = sanitizeSpokenMath(transcript);
        setInputPrompt(sanitized);

        if (event.results[0].isFinal) {
          setSpeechStatus(`Transcribed: "${sanitized}"`);
          setTimeout(() => setSpeechStatus(null), 3000);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setSpeechStatus(null);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser to dictate.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Please press the microphone and try again.');
        } else {
          setSpeechError(`Speech recognition error: ${event.error || 'Unknown error'}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setSpeechStatus(null);
      setSpeechError(`Failed to initialize microphone: ${err.message || 'Error'}`);
    }
  }, [isListening]);

  // Text-to-Speech: Read full assistant explanation aloud
  const handleSpeakFullExplanation = useCallback(
    (msg: AIMessage) => {
      if (activeSpeakingId === msg.id) {
        if (isSpeakingPaused) {
          resumeSpeaking();
          setIsSpeakingPaused(false);
        } else {
          pauseSpeaking();
          setIsSpeakingPaused(true);
        }
        return;
      }

      stopSpeaking();
      setActiveSpeakingId(msg.id);
      setIsSpeakingPaused(false);
      setSpeakingStepIndex(null);

      let fullSpeechText = msg.content;
      if (msg.steps && msg.steps.length > 0) {
        fullSpeechText += '. Step by step explanation: ' + msg.steps.map((st, i) => `Step ${i + 1}: ${st}`).join('. ');
      }
      if (msg.expression) {
        fullSpeechText += `. Equivalent calculator expression: ${msg.expression}.`;
      }

      speakText(fullSpeechText, {
        rate: speechPlaybackRate,
        onStart: () => {
          setActiveSpeakingId(msg.id);
          setIsSpeakingPaused(false);
        },
        onEnd: () => {
          setActiveSpeakingId(null);
          setIsSpeakingPaused(false);
          setSpeakingStepIndex(null);
        },
        onError: (err) => {
          console.warn('Speech synthesis error:', err);
          setActiveSpeakingId(null);
          setIsSpeakingPaused(false);
          setSpeakingStepIndex(null);
        },
      });
    },
    [activeSpeakingId, isSpeakingPaused, speechPlaybackRate]
  );

  // Text-to-Speech: Read single step aloud
  const handleSpeakSingleStep = useCallback(
    (msgId: string, stepIndex: number, stepText: string) => {
      const stepSpeakKey = `${msgId}-step-${stepIndex}`;

      if (activeSpeakingId === stepSpeakKey) {
        if (isSpeakingPaused) {
          resumeSpeaking();
          setIsSpeakingPaused(false);
        } else {
          pauseSpeaking();
          setIsSpeakingPaused(true);
        }
        return;
      }

      stopSpeaking();
      setActiveSpeakingId(stepSpeakKey);
      setSpeakingStepIndex(stepIndex);
      setIsSpeakingPaused(false);

      speakText(`Step ${stepIndex + 1}: ${stepText}`, {
        rate: speechPlaybackRate,
        onStart: () => {
          setActiveSpeakingId(stepSpeakKey);
          setIsSpeakingPaused(false);
        },
        onEnd: () => {
          setActiveSpeakingId(null);
          setIsSpeakingPaused(false);
          setSpeakingStepIndex(null);
        },
        onError: (err) => {
          console.warn('Speech synthesis step error:', err);
          setActiveSpeakingId(null);
          setIsSpeakingPaused(false);
          setSpeakingStepIndex(null);
        },
      });
    },
    [activeSpeakingId, isSpeakingPaused, speechPlaybackRate]
  );

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setActiveSpeakingId(null);
    setIsSpeakingPaused(false);
    setSpeakingStepIndex(null);
  }, []);

  const handleClear = () => {
    stopSpeaking();
    setActiveSpeakingId(null);
    setIsSpeakingPaused(false);
    setSpeakingStepIndex(null);

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Tutor session reset. Ask a new mathematical question, request a hint, or click "Start Practice" to test your mastery.',
        timestamp: Date.now(),
      },
    ]);
    setSpeechError(null);
    setSpeechStatus(null);
    setStepCheckResult(null);
    setActiveMistakeAnalysis(null);
    setHintLevel(1);
  };

  // Export full conversation to a downloadable Markdown (.md) file
  const handleExportConversation = () => {
    if (messages.length === 0) return;
    const markdown = generateConversationMarkdown(messages);
    downloadMarkdownFile(markdown);
    setIsExported(true);
    setTimeout(() => setIsExported(false), 2500);
  };

  // Copy rendered formula directly to clipboard in LaTeX syntax
  const handleCopyLaTeX = async (msg: AIMessage) => {
    const latex = extractLaTeXFormula(msg);
    if (!latex) return;
    const ok = await copyTextToClipboard(latex);
    if (ok) {
      setCopiedLatexId(msg.id);
      setTimeout(() => {
        setCopiedLatexId((prev) => (prev === msg.id ? null : prev));
      }, 2000);
    }
  };

  // Copy individual step formula in LaTeX syntax
  const handleCopyStepLaTeX = async (stepId: string, stepText: string) => {
    const dummyMsg: AIMessage = {
      id: stepId,
      role: 'assistant',
      content: stepText,
      timestamp: Date.now(),
    };
    const latex = extractLaTeXFormula(dummyMsg) || stepText;
    const ok = await copyTextToClipboard(latex);
    if (ok) {
      setCopiedStepId(stepId);
      setTimeout(() => {
        setCopiedStepId((prev) => (prev === stepId ? null : prev));
      }, 2000);
    }
  };

  // Quick Prompt dispatch handler
  const handleQuickPromptClick = (type: QuickPromptType, targetStep?: string) => {
    if (type === 'explain-step' && targetStep) {
      // Direct per-step explanation
      const promptText = buildQuickPrompt(type, { targetStep });
      handleSend(promptText);
      return;
    }

    if (type === 'check-errors') {
      // If active problem exists, run structured mistake analysis
      const analysis = analyzeMistake(activeProblem, userStepInput || activeProblem, currentResult);
      setActiveMistakeAnalysis(analysis);
    }

    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
    const promptText = buildQuickPrompt(type, {
      inputPrompt,
      currentExpression,
      currentResult,
      targetStep,
      lastAssistantMessage,
    });
    handleSend(promptText);
  };

  // ---------------------------------------------------------------------------
  // Tutor Mode Actions
  // ---------------------------------------------------------------------------

  // Give / Next Hint (Progressively stronger hints: 1 -> 5)
  const handleGiveHint = () => {
    if (hintLevel < 5) {
      const nextLevel = (hintLevel + 1) as HintLevel;
      setHintLevel(nextLevel);
    }
  };

  const handleResetHints = () => {
    setHintLevel(1);
  };

  const handleShowSolution = () => {
    setHintLevel(5);
  };

  // Deterministic Step Checking
  const handleCheckStep = () => {
    if (!userStepInput.trim()) return;
    setIsCheckingStep(true);
    const result = checkUserStep(activeProblem, userStepInput);
    setStepCheckResult(result);
    setIsCheckingStep(false);

    // If step is incorrect or invalid transformation, prepare mistake analysis
    if (result.status === 'incorrect' || result.status === 'invalid_transformation') {
      const analysis = analyzeMistake(activeProblem, userStepInput);
      setActiveMistakeAnalysis(analysis);
    } else {
      setActiveMistakeAnalysis(null);
    }
  };

  // Save mistake to Review Mistakes
  const handleSaveMistake = () => {
    if (!activeMistakeAnalysis) return;
    const saved = saveMistake({
      originalProblem: activeProblem,
      userAnswerOrStep: activeMistakeAnalysis.rawMistake || userStepInput || activeProblem,
      correctResult: currentResult || 'Expected standard form',
      mistakeCategory: activeMistakeAnalysis.errorType,
      explanation: `${activeMistakeAnalysis.whyItIsWrong} ${activeMistakeAnalysis.correctPrinciple}`,
      preventionTip: activeMistakeAnalysis.preventionTip,
      topic: effectiveTopic,
      difficulty,
    });
    setSavedMistakes(loadSavedMistakes());
    setMistakeJustSaved(true);
    setTimeout(() => setMistakeJustSaved(false), 2000);
  };

  // Practice Generator & Session
  const handleStartPractice = (asExam: boolean = false) => {
    const problems = generatePracticeProblems(effectiveTopic, difficulty, asExam ? 5 : 3);
    const newSession: PracticeSessionState = {
      isActive: true,
      isExamMode: asExam,
      currentIndex: 0,
      problems,
      userAnswers: {},
      problemResults: {},
      startTime: Date.now(),
      elapsedSeconds: 0,
      isFinished: false,
      score: 0,
      totalProblems: problems.length,
    };
    setPracticeSession(newSession);
    setPracticeAnswerInput('');
    setPracticeFeedback(null);
    setActiveHints(problems[0].hints);
    setHintLevel(1);
  };

  const handleCheckPracticeAnswer = () => {
    if (!practiceSession || !practiceAnswerInput.trim()) return;
    const currentProb = practiceSession.problems[practiceSession.currentIndex];
    const evaluation = evaluatePracticeAnswer(currentProb, practiceAnswerInput);
    setPracticeFeedback(evaluation);

    const isCorrect = evaluation.isCorrect;
    const currentResults = { ...practiceSession.problemResults };
    const prevAttempts = currentResults[practiceSession.currentIndex]?.attempts || 0;

    currentResults[practiceSession.currentIndex] = {
      isCorrect,
      attempts: prevAttempts + 1,
      hintsUsed: hintLevel - 1,
      timeSpentSec: practiceSession.elapsedSeconds,
    };

    setPracticeSession({
      ...practiceSession,
      problemResults: currentResults,
      userAnswers: {
        ...practiceSession.userAnswers,
        [practiceSession.currentIndex]: practiceAnswerInput,
      },
    });

    if (!isCorrect) {
      // Auto-analyze mistake for student
      const analysis = analyzeMistake(currentProb.question, practiceAnswerInput, currentProb.correctAnswer);
      setActiveMistakeAnalysis(analysis);
    }
  };

  const handleNextPracticeProblem = () => {
    if (!practiceSession) return;
    const nextIdx = practiceSession.currentIndex + 1;

    if (nextIdx >= practiceSession.problems.length) {
      // Finish session
      const correctCount = Object.values(practiceSession.problemResults).filter((r) => r.isCorrect).length;
      const totalHints = Object.values(practiceSession.problemResults).reduce((sum, r) => sum + r.hintsUsed, 0);
      const finishedSession: PracticeSessionState = {
        ...practiceSession,
        currentIndex: practiceSession.problems.length,
        isFinished: true,
        score: correctCount,
      };
      setPracticeSession(finishedSession);
      const updatedStats = recordPracticeSessionResult(practiceSession.problems.length, correctCount, totalHints);
      setTutorStats(updatedStats);
    } else {
      // Proceed to next question
      setPracticeSession({
        ...practiceSession,
        currentIndex: nextIdx,
      });
      setPracticeAnswerInput('');
      setPracticeFeedback(null);
      setActiveHints(practiceSession.problems[nextIdx].hints);
      setHintLevel(1);
      setActiveMistakeAnalysis(null);
    }
  };

  const handleExitPractice = () => {
    setPracticeSession(null);
    setPracticeAnswerInput('');
    setPracticeFeedback(null);
  };

  const handleDismissMistakeItem = (id: string) => {
    dismissMistake(id);
    setSavedMistakes(loadSavedMistakes());
  };

  const handleClearAllMistakes = () => {
    clearAllMistakes();
    setSavedMistakes([]);
  };

  const handlePracticeSimilar = (topic: MathTopic, diff: DifficultyLevel) => {
    setShowMistakesModal(false);
    setSelectedTopic(topic);
    setDifficulty(diff);
    handleStartPractice(false);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Header & Tutor Mode Switcher */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 border border-purple-500/20 backdrop-blur-xs shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-inner">
              {tutorMode === 'tutor' ? (
                <GraduationCap className="w-5 h-5 text-purple-300" />
              ) : tutorMode === 'solver-review' ? (
                <Search className="w-5 h-5 text-cyan-300" />
              ) : (
                <Sparkles className="w-5 h-5 text-purple-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display-math font-bold text-base text-white dark:text-white light:text-slate-900">
                  AI Mathematical Tutor Mode 2.0
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Brain className="w-3 h-3 text-purple-400" />
                  Socratic Guided
                </span>
                {tutorStats.streakDays > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Flame className="w-3 h-3 text-amber-400" />
                    {tutorStats.streakDays}d Streak
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-300/80">
                Interactive Socratic tutoring, 5-level hints, deterministic step checking & error discovery.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Review Mistakes Button */}
            <button
              id="btn-open-mistakes"
              type="button"
              onClick={() => setShowMistakesModal(true)}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 hover:text-amber-100 transition-all shadow-xs"
              title="Review mistakes recorded during tutoring sessions"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Review Mistakes ({savedMistakes.length})</span>
            </button>

            {/* Export Conversation Button */}
            <button
              id="btn-export-conversation"
              type="button"
              onClick={handleExportConversation}
              disabled={messages.length === 0}
              className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-all shadow-xs ${
                isExported
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-300 hover:text-white'
              }`}
              title="Export conversation history and explanations to Markdown (.md)"
            >
              {isExported ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">Exported (.md)!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export</span>
                </>
              )}
            </button>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 transition-colors"
              title="Clear current session and chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Mode Selector & Pedagogy Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-purple-500/20">
          {/* 1. TUTOR MODE SWITCH: Assistant vs Tutor vs Solver Review */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/60 border border-slate-800/80 shrink-0">
            <button
              id="btn-mode-assistant"
              type="button"
              onClick={() => setTutorMode('assistant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tutorMode === 'assistant'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Assistant</span>
            </button>
            <button
              id="btn-mode-tutor"
              type="button"
              onClick={() => setTutorMode('tutor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tutorMode === 'tutor'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Tutor</span>
            </button>
            <button
              id="btn-mode-solver-review"
              type="button"
              onClick={() => setTutorMode('solver-review')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tutorMode === 'solver-review'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Solver Review</span>
            </button>
          </div>

          {/* Context Options: Topic + Difficulty + Learning Objective */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Topic Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Topic:</span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value as MathTopic | 'auto')}
                className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer text-xs"
                title="Select mathematics topic or use automatic detection"
              >
                <option value="auto" className="bg-slate-900 text-cyan-300">
                  Auto: {detectedTopic}
                </option>
                {ALL_MATH_TOPICS.map((top) => (
                  <option key={top} value={top} className="bg-slate-900 text-white">
                    {top}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Level:</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="bg-transparent text-purple-300 font-semibold focus:outline-none cursor-pointer text-xs capitalize"
              >
                <option value="beginner" className="bg-slate-900 text-white">
                  Beginner
                </option>
                <option value="intermediate" className="bg-slate-900 text-white">
                  Intermediate
                </option>
                <option value="advanced" className="bg-slate-900 text-white">
                  Advanced
                </option>
                <option value="expert" className="bg-slate-900 text-white">
                  Expert
                </option>
              </select>
            </div>

            {/* Learning Objective */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Goal:</span>
              <select
                value={learningObjective}
                onChange={(e) => setLearningObjective(e.target.value as LearningObjective)}
                className="bg-transparent text-emerald-300 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="concept" className="bg-slate-900 text-white">
                  Understand concept
                </option>
                <option value="practice" className="bg-slate-900 text-white">
                  Practice problem
                </option>
                <option value="formula" className="bg-slate-900 text-white">
                  Learn formula
                </option>
                <option value="check-work" className="bg-slate-900 text-white">
                  Check my work
                </option>
                <option value="exam" className="bg-slate-900 text-white">
                  Prepare for exam
                </option>
                <option value="review-mistakes" className="bg-slate-900 text-white">
                  Review mistakes
                </option>
              </select>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Lang:</span>
              <select
                id="select-tutor-language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-purple-300 font-semibold focus:outline-none cursor-pointer text-xs max-w-[130px]"
                title="Select language for tutor explanations"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Socratic Mode Toggle */}
            <button
              id="btn-toggle-socratic"
              type="button"
              onClick={() => setSocraticMode(!socraticMode)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                socraticMode
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800'
              }`}
              title="When enabled, tutor asks guided questions rather than solving upfront"
            >
              <Brain className={`w-3.5 h-3.5 ${socraticMode ? 'text-purple-400' : 'text-slate-500'}`} />
              <span>Socratic: {socraticMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Practice / Exam Trigger */}
            <div className="flex items-center gap-1">
              <button
                id="btn-start-practice"
                type="button"
                onClick={() => handleStartPractice(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Generate and solve validated practice problems for the current topic"
              >
                <Play className="w-3 h-3 fill-slate-950" />
                <span>Practice</span>
              </button>
              <button
                id="btn-start-exam"
                type="button"
                onClick={() => handleStartPractice(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                title="Start timed Exam Mode with problem progression and scoring"
              >
                <Timer className="w-3.5 h-3.5 text-amber-400" />
                <span>Exam</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE PRACTICE SESSION OR EXAM RUNNER */}
      {practiceSession && practiceSession.isActive && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-cyan-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                {practiceSession.isExamMode ? 'Timed Exam Mode' : 'Guided Practice Session'}
              </span>
              <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                Problem {Math.min(practiceSession.currentIndex + 1, practiceSession.totalProblems)} of{' '}
                {practiceSession.totalProblems}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-slate-300 font-mono">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {Math.floor(practiceSession.elapsedSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(practiceSession.elapsedSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleExitPractice}
                className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                title="Exit practice session"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!practiceSession.isFinished ? (
            <div className="space-y-3">
              {/* Question card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    {practiceSession.problems[practiceSession.currentIndex]?.topic} (
                    {practiceSession.problems[practiceSession.currentIndex]?.difficultyTier})
                  </span>
                  {practiceSession.problems[practiceSession.currentIndex]?.latexFormula && (
                    <span className="text-[11px] font-mono text-cyan-300/80">
                      Formula: {practiceSession.problems[practiceSession.currentIndex].latexFormula}
                    </span>
                  )}
                </div>
                <div className="text-sm text-white font-medium">
                  <MathMarkdownRenderer
                    content={practiceSession.problems[practiceSession.currentIndex]?.question || ''}
                  />
                </div>
              </div>

              {/* Hints Drawer (if not exam mode) */}
              {!practiceSession.isExamMode && (
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-purple-300 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                      {HINT_LEVEL_DESCRIPTIONS[hintLevel].title}
                    </span>
                    <button
                      type="button"
                      onClick={handleGiveHint}
                      disabled={hintLevel >= 5}
                      className="text-xs text-purple-300 hover:text-purple-100 font-bold underline disabled:opacity-40"
                    >
                      {hintLevel < 5 ? 'Need Stronger Hint →' : 'Full Solution Revealed'}
                    </button>
                  </div>
                  <div className="text-xs text-slate-300 italic bg-purple-950/30 p-2.5 rounded-lg">
                    <MathMarkdownRenderer content={activeHints[hintLevel - 1]} />
                  </div>
                </div>
              )}

              {/* User Answer Field & Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={practiceAnswerInput}
                  onChange={(e) => setPracticeAnswerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCheckPracticeAnswer();
                  }}
                  placeholder="Enter your final answer or algebraic value..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleCheckPracticeAnswer}
                  disabled={!practiceAnswerInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all shadow-sm"
                >
                  Check Answer
                </button>
                <button
                  type="button"
                  onClick={handleNextPracticeProblem}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center gap-1 justify-center"
                >
                  <span>
                    {practiceSession.currentIndex + 1 >= practiceSession.totalProblems
                      ? 'Finish Session'
                      : 'Next Problem'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Feedback banner */}
              {practiceFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    practiceFeedback.isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {practiceFeedback.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <MathMarkdownRenderer content={practiceFeedback.feedback} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Session Summary View */
            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Practice Session Complete!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You scored {practiceSession.score} out of {practiceSession.totalProblems} (
                  {Math.round((practiceSession.score / practiceSession.totalProblems) * 100)}% accuracy)
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartPractice(practiceSession.isExamMode)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  Try Another Set
                </button>
                <button
                  type="button"
                  onClick={handleExitPractice}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
                >
                  Back to Tutor
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TUTOR MODE INTERACTIVE WORKSPACE (Hints, Step Checker, Mistake Card) */}
      {tutorMode === 'tutor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Active Problem / Context Banner (Full width across cols) */}
          <div className="lg:col-span-12 p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 to-slate-900/60 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                Active Tutoring Target:
              </span>
              <span className="text-xs font-mono font-bold text-white bg-slate-950/60 px-2.5 py-1 rounded-lg border border-purple-500/20">
                {activeProblem}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                Verified Math Engine
              </span>
              {onApplyToCalculator && currentExpression && (
                <button
                  type="button"
                  onClick={() => onApplyToCalculator(currentExpression)}
                  className="text-[10px] text-cyan-300 hover:underline font-mono"
                >
                  Sync to Calc
                </button>
              )}
            </div>
          </div>

          {/* LEFT 6 COLS: 5-LEVEL PROGRESSIVE HINT SYSTEM */}
          <div className="lg:col-span-6 p-4 rounded-xl bg-slate-900/70 dark:bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between space-y-3 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">Progressive Hint System</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Level {hintLevel} / 5
                </span>
              </div>

              {/* Stepper Dots */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setHintLevel(lvl as HintLevel)}
                    className={`h-2 rounded-full transition-all ${
                      lvl <= hintLevel
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                    title={HINT_LEVEL_DESCRIPTIONS[lvl as HintLevel].title}
                  />
                ))}
              </div>

              {/* Active Hint Content */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-purple-500/20 text-xs text-slate-200 min-h-[70px] flex flex-col justify-center">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                  {HINT_LEVEL_DESCRIPTIONS[hintLevel].title}
                </span>
                <MathMarkdownRenderer content={activeHints[hintLevel - 1]} />
              </div>
            </div>

            {/* Hint Buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                id="btn-give-hint"
                type="button"
                onClick={handleGiveHint}
                disabled={hintLevel >= 5}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 transition-all flex items-center gap-1 shadow-xs active:scale-95"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{hintLevel === 1 ? 'Give me a Hint' : 'Next Hint'}</span>
              </button>

              <button
                id="btn-show-solution"
                type="button"
                onClick={handleShowSolution}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reveal complete solution proof (Hint 5)"
              >
                Show Solution
              </button>

              <button
                id="btn-reset-hints"
                type="button"
                onClick={handleResetHints}
                className="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors"
                title="Reset to Hint Level 1"
              >
                Reset
              </button>
            </div>
          </div>

          {/* RIGHT 6 COLS: "CHECK MY STEP" & MISTAKE ANALYSIS */}
          <div className="lg:col-span-6 p-4 rounded-xl bg-slate-900/70 dark:bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between space-y-3 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-300">Check My Step</span>
                </div>
                <span className="text-[10px] text-slate-400">Deterministic verification</span>
              </div>

              {/* Step Input */}
              <div className="flex gap-2">
                <input
                  id="input-user-step"
                  type="text"
                  value={userStepInput}
                  onChange={(e) => setUserStepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCheckStep();
                  }}
                  placeholder="Enter your next step (e.g. 2x = 12)..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  id="btn-check-step"
                  type="button"
                  onClick={handleCheckStep}
                  disabled={!userStepInput.trim() || isCheckingStep}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all shadow-xs"
                >
                  Check Step
                </button>
              </div>

              {/* Step Checking Output */}
              {stepCheckResult && (
                <div
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    stepCheckResult.status === 'mathematically_equivalent'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : stepCheckResult.status === 'partially_correct'
                      ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                      : stepCheckResult.status === 'missing_condition'
                      ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {stepCheckResult.status === 'mathematically_equivalent' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{stepCheckResult.statusLabel}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{stepCheckResult.feedback}</p>
                  {stepCheckResult.suggestedNextStep && (
                    <p className="text-[11px] font-mono text-cyan-300">
                      Next Step: {stepCheckResult.suggestedNextStep}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Quick Audit Action */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => handleQuickPromptClick('check-errors')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Audit Calculation for Errors</span>
              </button>
              {activeMistakeAnalysis && (
                <button
                  type="button"
                  onClick={handleSaveMistake}
                  className="text-[11px] px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold transition-all"
                >
                  {mistakeJustSaved ? 'Saved to Mistakes!' : '+ Record Mistake'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STRUCTURED MISTAKE ANALYSIS CARD (if active) */}
      {activeMistakeAnalysis && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Structured Mistake Analysis: {activeMistakeAnalysis.errorTypeLabel}
            </span>
            <button
              type="button"
              onClick={() => setActiveMistakeAnalysis(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded bg-slate-950/50 border border-amber-500/20">
              <strong className="text-amber-300 block mb-0.5">WHY IT IS WRONG:</strong>
              <p className="text-slate-300 text-[11px]">{activeMistakeAnalysis.whyItIsWrong}</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/50 border border-amber-500/20">
              <strong className="text-cyan-300 block mb-0.5">CORRECT PRINCIPLE:</strong>
              <p className="text-slate-300 text-[11px]">{activeMistakeAnalysis.correctPrinciple}</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/50 border border-amber-500/20">
              <strong className="text-emerald-300 block mb-0.5">CORRECTION:</strong>
              <p className="text-slate-300 text-[11px]">{activeMistakeAnalysis.correction}</p>
            </div>
            <div className="p-2.5 rounded bg-slate-950/50 border border-amber-500/20">
              <strong className="text-purple-300 block mb-0.5">PREVENTION TIP:</strong>
              <p className="text-slate-300 text-[11px]">{activeMistakeAnalysis.preventionTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Quick Prompt Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] text-slate-500 mr-1 hidden sm:inline">Try:</span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              if (prompt === 'Explain this step') handleQuickPromptClick('explain-step');
              else if (prompt === 'Check for errors') handleQuickPromptClick('check-errors');
              else if (prompt === 'Simplify expression') handleQuickPromptClick('simplify');
              else if (prompt === 'Give me a Hint') handleGiveHint();
              else if (prompt === 'Ask a Socratic question') {
                handleSend('Please ask me a Socratic question to help me figure out the next step for: ' + activeProblem);
              } else {
                handleSend(prompt);
              }
            }}
            className={`text-[11px] px-3 py-1 rounded-full whitespace-nowrap transition-all hover:scale-105 ${
              prompt === 'Explain this step'
                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 font-semibold'
                : prompt === 'Check for errors'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 font-semibold'
                : prompt === 'Simplify expression'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30 font-semibold'
                : 'bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-100 text-purple-300 dark:text-purple-300 light:text-purple-700 border border-purple-500/20 hover:bg-purple-500/10'
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Speech Dictation Status / Error Banner */}
      {isListening && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="font-medium">
            {speechStatus || 'Listening... Speak your mathematical query'}
          </span>
          <button
            type="button"
            onClick={toggleListening}
            className="ml-auto text-rose-300 hover:text-rose-100 text-[11px] underline"
          >
            Stop
          </button>
        </div>
      )}

      {speechError && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{speechError}</span>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="ml-auto text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Conversation Flow */}
      <div className="flex-1 min-h-[260px] max-h-[480px] overflow-y-auto p-4 rounded-2xl bg-slate-950/60 dark:bg-slate-950/60 light:bg-white/80 border border-slate-800 dark:border-slate-800 light:border-slate-200 flex flex-col gap-4 shadow-inner">
        {messages.map((msg) => {
          const isThisSpeaking = activeSpeakingId === msg.id;
          const formulaLatex = extractLaTeXFormula(msg);

          return (
            <div
              key={msg.id}
              className={`flex gap-3 text-sm leading-relaxed ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-none'
                    : 'bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-100 text-slate-200 dark:text-slate-200 light:text-slate-800 rounded-bl-none border border-purple-500/20'
                }`}
              >
                {/* Message Content with KaTeX */}
                {msg.role === 'assistant' ? (
                  <MathMarkdownRenderer content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Formula Highlight Card */}
                {msg.formula && (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 dark:bg-purple-950/40 light:bg-purple-50 border border-purple-500/30 flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-mono-math text-xs text-purple-300 dark:text-purple-300 light:text-purple-700">
                      <MathMarkdownRenderer content={`$$${msg.formula}$$`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyLaTeX(msg)}
                      title="Copy formula in LaTeX syntax"
                      className="text-[11px] flex items-center gap-1 text-purple-400 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded transition-colors"
                    >
                      {copiedLatexId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copied LaTeX</span>
                        </>
                      ) : (
                        <>
                          <Code2 className="w-3 h-3" />
                          <span>Copy LaTeX</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Step-by-step breakdown list */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className="mt-1 space-y-1.5 border-t border-purple-500/20 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 dark:text-purple-400 light:text-purple-600 block">
                      Derivation Steps:
                    </span>
                    <div className="space-y-1.5">
                      {msg.steps.map((st, i) => {
                        const isThisStepSpeaking =
                          activeSpeakingId === `${msg.id}-step-${i}`;

                        return (
                          <div
                            key={i}
                            className={`p-2 rounded-lg text-xs flex items-start justify-between gap-2 transition-colors ${
                              isThisStepSpeaking
                                ? 'bg-purple-950/40 border border-purple-500/40'
                                : 'bg-slate-950/40 border border-slate-800/40 hover:border-slate-700/60'
                            }`}
                          >
                            <span className="text-cyan-400 font-bold shrink-0 text-xs mt-0.5">
                              {i + 1}.
                            </span>

                            <div className="flex-1 min-w-0">
                              <MathMarkdownRenderer content={st} />
                            </div>

                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                              {/* Explain this step inline action */}
                              <button
                                type="button"
                                onClick={() => handleQuickPromptClick('explain-step', st)}
                                title={`Ask AI to explain step ${i + 1} in detail`}
                                className="p-1 rounded transition-colors text-slate-500 hover:text-purple-300 hover:bg-purple-500/10"
                              >
                                <HelpCircle className="w-3 h-3" />
                              </button>

                              {/* Step Copy LaTeX */}
                              <button
                                type="button"
                                onClick={() => handleCopyStepLaTeX(`${msg.id}-step-${i}`, st)}
                                title="Copy step formula in LaTeX syntax"
                                className={`p-1 rounded transition-colors ${
                                  copiedStepId === `${msg.id}-step-${i}`
                                    ? 'text-emerald-300 bg-emerald-500/20'
                                    : 'text-slate-500 hover:text-cyan-300 hover:bg-slate-800'
                                }`}
                              >
                                {copiedStepId === `${msg.id}-step-${i}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Code2 className="w-3 h-3" />
                                )}
                              </button>

                              {/* Step TTS Listen */}
                              {isTTSSupported && (
                                <button
                                  type="button"
                                  onClick={() => handleSpeakSingleStep(msg.id, i, st)}
                                  title={
                                    isThisStepSpeaking && !isSpeakingPaused
                                      ? 'Pause this step'
                                      : `Listen to step ${i + 1}`
                                  }
                                  className={`p-1 rounded transition-colors ${
                                    isThisStepSpeaking
                                      ? 'text-purple-300 bg-purple-500/30'
                                      : 'text-slate-500 hover:text-cyan-300 hover:bg-slate-800'
                                  }`}
                                >
                                  {isThisStepSpeaking && !isSpeakingPaused ? (
                                    <Pause className="w-3 h-3" />
                                  ) : (
                                    <Volume2 className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Assistant Message Footer (TTS Read Aloud & Verified Handshake) */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {isTTSSupported && (
                        <button
                          type="button"
                          onClick={() => handleSpeakFullExplanation(msg)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                            isThisSpeaking
                              ? 'text-purple-300 bg-purple-500/20 font-semibold'
                              : 'hover:text-purple-300'
                          }`}
                          title="Listen to full explanation read aloud"
                        >
                          {isThisSpeaking && !isSpeakingPaused ? (
                            <>
                              <Pause className="w-3 h-3 text-purple-400" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3 text-purple-400" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}

                      {isThisSpeaking && (
                        <button
                          type="button"
                          onClick={handleStopSpeaking}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded"
                          title="Stop playback"
                        >
                          <Square className="w-3 h-3" />
                        </button>
                      )}

                      {/* Copy LaTeX for entire message */}
                      {formulaLatex && (
                        <button
                          type="button"
                          onClick={() => handleCopyLaTeX(msg)}
                          className="flex items-center gap-1 hover:text-cyan-300 px-1.5 py-0.5 rounded transition-colors"
                          title="Copy all mathematical formulas in LaTeX syntax"
                        >
                          {copiedLatexId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Code2 className="w-3 h-3" />
                              <span>Copy LaTeX</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Grounded Mathematical Knowledge Badge */}
                    {msg.isGrounded && (
                      <div
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        title={msg.knowledgeConceptsUsed?.join(', ') || 'Grounded in verified mathematical corpus'}
                      >
                        <BookOpen className="w-3 h-3 text-cyan-400" />
                        <span>Grounded: {msg.knowledgeConceptsUsed?.[0] || 'Core Math'}</span>
                      </div>
                    )}

                    {/* Deterministic Verification Handshake Badge */}
                    {msg.isVerified !== undefined && (
                      <div
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          msg.isVerified
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {msg.isVerified ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>{msg.verificationNote || 'Handshake complete'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-purple-400">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
            </div>
            <span>Analyzing problem and synthesizing mathematical proof...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Clickable Quick Prompts Toolbar */}
      <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100/90 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-300">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 dark:text-purple-300 light:text-purple-700 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Quick Prompts</span>
          </div>
          {currentExpression ? (
            <span
              className="text-[10px] font-mono text-cyan-400/90 truncate max-w-[220px] bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-800/30"
              title={`Active calculator expression: ${currentExpression}`}
            >
              Context: {currentExpression}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">
              Click to query AI instantly
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {/* Explain this step */}
          <button
            id="btn-quick-explain-step"
            type="button"
            onClick={() => handleQuickPromptClick('explain-step')}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-100 border border-purple-500/30 hover:border-purple-500/50 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ask AI to deconstruct and explain mathematical reasoning step-by-step"
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>Explain this step</span>
          </button>

          {/* Check for errors */}
          <button
            id="btn-quick-check-errors"
            type="button"
            onClick={() => handleQuickPromptClick('check-errors')}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 border border-amber-500/30 hover:border-amber-500/50 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Audit calculation or proof for arithmetic errors, sign mistakes, or edge cases"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Check for errors</span>
          </button>

          {/* Simplify expression */}
          <button
            id="btn-quick-simplify"
            type="button"
            onClick={() => handleQuickPromptClick('simplify')}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-100 border border-cyan-500/30 hover:border-cyan-500/50 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Simplify algebraic expression to its simplest canonical form"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simplify expression</span>
          </button>

          {/* Solve step-by-step */}
          <button
            id="btn-quick-solve"
            type="button"
            onClick={() => handleQuickPromptClick('solve-step-by-step')}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-100 border border-emerald-500/30 hover:border-emerald-500/50 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate a full step-by-step solution with justifications"
          >
            <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
            <span>Solve step-by-step</span>
          </button>

          {/* Alternative method */}
          <button
            id="btn-quick-alternative"
            type="button"
            onClick={() => handleQuickPromptClick('alternative')}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-100 border border-indigo-500/30 hover:border-indigo-500/50 transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Explore an alternative mathematical method or approach"
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
            <span>Alternative method</span>
          </button>
        </div>
      </div>

      {/* Input Bar with Voice Dictation & Text Sanitization */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <input
            id="ai-prompt-input"
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              isListening
                ? 'Listening to your voice... speak now'
                : tutorMode === 'tutor'
                ? 'Ask tutor a question or type a step (e.g. "What do I do next for 2x+5=17?")...'
                : 'Ask a mathematical question or dictate via microphone...'
            }
            disabled={isLoading}
            className={`w-full pl-4 pr-11 py-3 rounded-xl bg-slate-900 dark:bg-slate-900 light:bg-white border text-white dark:text-white light:text-slate-900 text-sm focus:outline-none transition-all shadow-inner ${
              isListening
                ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-950/20'
                : 'border-slate-800 dark:border-slate-800 light:border-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
            }`}
          />

          {/* Voice Dictation Button inside input */}
          <button
            id="btn-voice-dictation"
            type="button"
            onClick={toggleListening}
            disabled={isLoading || !isSpeechSupported}
            title={
              !isSpeechSupported
                ? 'Voice recognition not supported in this browser'
                : isListening
                ? 'Stop voice dictation'
                : 'Dictate mathematical question (Web Speech API)'
            }
            aria-label={isListening ? 'Stop recording voice' : 'Start recording voice'}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              !isSpeechSupported
                ? 'text-slate-600 cursor-not-allowed opacity-50'
                : isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                : 'text-slate-400 hover:text-purple-400 hover:bg-slate-800/80 active:scale-95'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Submit Button */}
        <button
          id="btn-ai-submit"
          type="submit"
          disabled={isLoading || !inputPrompt.trim()}
          className={`px-5 py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
            isLoading || !inputPrompt.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20 active:scale-95'
          }`}
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>

      {/* MISTAKES REVIEW MODAL / DRAWER */}
      {showMistakesModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Tutoring Mistake Review ({savedMistakes.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMistakesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {savedMistakes.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-400/60 mx-auto" />
                  <p className="text-sm">No recorded mistakes! Clean record.</p>
                  <p className="text-xs">
                    When you audit calculations or make an algebraic error in tutoring, you can save them here for targeted review.
                  </p>
                </div>
              ) : (
                savedMistakes.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                          {m.mistakeCategory.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {m.topic} • {m.difficulty}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(m.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-200">
                        <strong className="text-slate-400">Problem: </strong>
                        <span className="font-mono">{m.originalProblem}</span>
                      </div>
                      <div className="text-rose-300">
                        <strong className="text-slate-400">Your Attempt: </strong>
                        <span className="font-mono">{m.userAnswerOrStep}</span>
                      </div>
                      <div className="text-emerald-300">
                        <strong className="text-slate-400">Correct: </strong>
                        <span className="font-mono">{m.correctResult}</span>
                      </div>
                    </div>

                    <p className="text-slate-300 text-[11px] bg-slate-900/80 p-2 rounded">
                      {m.explanation}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handlePracticeSimilar(m.topic, m.difficulty)}
                        className="text-xs text-cyan-400 hover:underline font-medium"
                      >
                        Practice Similar Problem →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismissMistakeItem(m.id)}
                        className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            {savedMistakes.length > 0 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearAllMistakes}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Clear All Mistakes
                </button>
                <button
                  type="button"
                  onClick={() => setShowMistakesModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
