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

interface AIAssistantPanelProps {
  currentExpression?: string;
  currentResult?: string;
  onApplyToCalculator?: (expr: string) => void;
}

const QUICK_PROMPTS = [
  'Explain this step',
  'Check for errors',
  'Simplify expression',
  'What is 15% of 850?',
  'Solve x² + 5x + 6 = 0',
  'Explain the Pythagorean theorem',
  'How is compound interest computed?',
  'Convert 45 miles per hour to km/h',
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
const MathMarkdownRenderer: React.FC<{ content: string; className?: string }> = ({
  content,
  className = '',
}) => {
  return (
    <div className={`prose-math text-xs sm:text-sm leading-relaxed break-words ${className}`}>
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
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your AI Mathematical Assistant. You can ask me to solve equations, break down complex arithmetic or percentage questions, explain geometry or physics formulas, or clarify calculations.\n\nFormulas are rendered in LaTeX notation (e.g. $a^2 + b^2 = c^2$), and you can click the **Listen** button on any response to hear the step-by-step explanation read aloud, or **Copy LaTeX** to copy formulas directly.',
      formula: 'a^2 + b^2 = c^2',
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
  }, [messages, isLoading, speechStatus]);

  // Clean up speech recognition & text-to-speech on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      stopSpeaking();
    };
  }, []);

  // Send message handler with input sanitization
  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend !== undefined ? textToSend : inputPrompt;
    const sanitized = sanitizeQueryText(rawText);

    if (!sanitized || isLoading) return;

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
        currentResult
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
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an issue processing your question. Please try again.',
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

        // Sanitize speech input: converts spoken terms like "plus", "divided by", "squared"
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
      // If currently speaking this message, toggle pause/play
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

      // Start new speech synthesis
      stopSpeaking();
      setActiveSpeakingId(msg.id);
      setIsSpeakingPaused(false);
      setSpeakingStepIndex(null);

      // Build text that includes answer and sequential steps
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
          'Conversation cleared. Feel free to ask any mathematical question or dictate via the microphone.',
        timestamp: Date.now(),
      },
    ]);
    setSpeechError(null);
    setSpeechStatus(null);
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

  // Quick Prompt dispatch handler ('Explain this step', 'Check for errors', 'Simplify expression', etc.)
  const handleQuickPromptClick = (type: QuickPromptType, targetStep?: string) => {
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

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-500/20 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display-math font-bold text-base text-white dark:text-white light:text-slate-900">
                AI Mathematical Assistant
              </h2>
              {isSpeechSupported && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  <Mic className="w-3 h-3 text-purple-400" />
                  Voice Input
                </span>
              )}
              {isTTSSupported && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  TTS Read-Aloud
                </span>
              )}
            </div>
            <p className="text-xs text-purple-300/80">
              Natural language problem solver, voice dictation, LaTeX math renderer & speech explainer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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
            title="Export conversation history and explanations to a Markdown (.md) file"
          >
            {isExported ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">Exported (.md)!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Export Conversation</span>
              </>
            )}
          </button>

          {/* Clear Chat Button */}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 transition-colors"
            title="Clear current chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

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
              else handleSend(prompt);
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
            className="ml-auto text-[11px] underline hover:text-white"
          >
            Stop
          </button>
        </div>
      )}

      {/* Active TTS Playback Control Bar */}
      {activeSpeakingId && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-cyan-950/60 border border-purple-500/30 text-xs shadow-md animate-fadeIn">
          <div className="flex items-center gap-2 text-purple-300">
            <div className="flex items-center gap-0.5 h-4">
              <span className={`w-1 bg-cyan-400 rounded-full ${isSpeakingPaused ? 'h-2' : 'h-3 animate-pulse'}`} />
              <span className={`w-1 bg-purple-400 rounded-full ${isSpeakingPaused ? 'h-3' : 'h-4 animate-bounce'}`} />
              <span className={`w-1 bg-cyan-400 rounded-full ${isSpeakingPaused ? 'h-1.5' : 'h-2.5 animate-pulse'}`} />
            </div>
            <span className="font-medium text-slate-200">
              {isSpeakingPaused ? 'Tutor Voice Paused' : 'Tutor Explaining Aloud...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed control */}
            <button
              type="button"
              onClick={() => {
                const nextRate = speechPlaybackRate === 1.0 ? 1.25 : speechPlaybackRate === 1.25 ? 0.9 : 1.0;
                setSpeechPlaybackRate(nextRate);
              }}
              className="px-2 py-0.5 text-[10px] rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
              title="Change speaking speed"
            >
              {speechPlaybackRate}x
            </button>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={() => {
                if (isSpeakingPaused) {
                  resumeSpeaking();
                  setIsSpeakingPaused(false);
                } else {
                  pauseSpeaking();
                  setIsSpeakingPaused(true);
                }
              }}
              className="p-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white transition-colors"
              title={isSpeakingPaused ? 'Resume speech' : 'Pause speech'}
            >
              {isSpeakingPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            {/* Stop */}
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="p-1 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white transition-colors"
              title="Stop voice playback"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      )}

      {speechError && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{speechError}</span>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-xs hover:text-white opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 shadow-sm flex flex-col gap-4 min-h-[350px] max-h-[520px] overflow-y-auto">
        {messages.map((msg) => {
          const isThisMsgSpeaking =
            activeSpeakingId === msg.id || activeSpeakingId?.startsWith(`${msg.id}-step-`);

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isThisMsgSpeaking
                      ? 'bg-purple-500/30 border-purple-400 text-purple-300 ring-2 ring-purple-500/40'
                      : 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm flex flex-col gap-2 transition-all ${
                  msg.role === 'user'
                    ? 'bg-cyan-500 text-slate-950 font-medium rounded-tr-xs'
                    : isThisMsgSpeaking
                    ? 'bg-slate-950/90 dark:bg-slate-950/90 light:bg-purple-50/80 text-slate-200 dark:text-slate-200 light:text-slate-800 border border-purple-500/50 shadow-md shadow-purple-500/10 rounded-tl-xs'
                    : 'bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100 text-slate-200 dark:text-slate-200 light:text-slate-800 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 rounded-tl-xs'
                }`}
              >
                {/* Assistant Message Header Actions */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 dark:border-slate-800/60 light:border-slate-200">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/80">
                        AI Tutor
                      </span>
                      {msg.isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Copy LaTeX Button for mathematical response */}
                      {extractLaTeXFormula(msg) && (
                        <button
                          id={`btn-copy-latex-${msg.id}`}
                          type="button"
                          onClick={() => handleCopyLaTeX(msg)}
                          title="Copy rendered formula in LaTeX syntax to clipboard"
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                            copiedLatexId === msg.id
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20'
                          }`}
                        >
                          {copiedLatexId === msg.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied LaTeX!</span>
                            </>
                          ) : (
                            <>
                              <Code2 className="w-3 h-3" />
                              <span>Copy LaTeX</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Text-to-Speech Listen Button */}
                      {isTTSSupported && (
                        <button
                          id={`btn-tts-${msg.id}`}
                          type="button"
                          onClick={() => handleSpeakFullExplanation(msg)}
                          title={
                            activeSpeakingId === msg.id
                              ? isSpeakingPaused
                                ? 'Resume voice explanation'
                                : 'Pause voice explanation'
                              : 'Listen to step-by-step explanation'
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                            activeSpeakingId === msg.id
                              ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/30'
                              : 'text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20'
                          }`}
                        >
                          {activeSpeakingId === msg.id ? (
                            isSpeakingPaused ? (
                              <>
                                <Play className="w-3 h-3" />
                                <span>Resume</span>
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>Pause</span>
                              </>
                            )
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Message Body: Rendered with LaTeX & Markdown */}
                {msg.role === 'assistant' ? (
                  <MathMarkdownRenderer content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                )}

                {/* Step Derivations if present with LaTeX & individual TTS controls */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                        Mathematical Steps & Proof:
                      </span>
                      {isTTSSupported && (
                        <span className="text-[10px] text-slate-500">
                          Click 🔊 to hear single step
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {msg.steps.map((st, i) => {
                        const isThisStepSpeaking =
                          activeSpeakingId === `${msg.id}-step-${i}`;

                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
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

                {/* Assistant Message Footer Actions */}
                {msg.role === 'assistant' && (
                  <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/40 dark:border-slate-800/40 light:border-slate-200">
                    <div className="flex items-center gap-2">
                      {extractLaTeXFormula(msg) && (
                        <button
                          type="button"
                          onClick={() => handleCopyLaTeX(msg)}
                          title="Copy rendered formula in LaTeX syntax"
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                            copiedLatexId === msg.id
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 border border-transparent'
                          }`}
                        >
                          {copiedLatexId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>LaTeX Copied!</span>
                            </>
                          ) : (
                            <>
                              <Code2 className="w-3 h-3" />
                              <span>Copy LaTeX</span>
                            </>
                          )}
                        </button>
                      )}

                      {msg.formula && (
                        <span
                          className="hidden md:inline-block text-[10px] font-mono text-cyan-300/80 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 max-w-[220px] truncate"
                          title={msg.formula}
                        >
                          ${msg.formula}$
                        </span>
                      )}
                    </div>

                    {/* Apply expression action if extracted */}
                    {msg.expression && onApplyToCalculator && (
                      <button
                        type="button"
                        onClick={() => onApplyToCalculator(msg.expression!)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-xs font-medium transition-colors"
                      >
                        <span>Insert "{msg.expression}"</span>
                        <CornerDownRight className="w-3 h-3" />
                      </button>
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
    </div>
  );
};
