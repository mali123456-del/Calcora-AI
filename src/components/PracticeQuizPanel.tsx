import React, { useState } from 'react';
import { Award, Lightbulb, CheckCircle2, XCircle, RotateCcw, ArrowRight, HelpCircle } from 'lucide-react';
import { PRACTICE_QUIZZES } from '../ai/client';
import { QuizQuestion } from '../types';

interface PracticeQuizPanelProps {
  onSendToCalculator?: (expr: string) => void;
}

export const PracticeQuizPanel: React.FC<PracticeQuizPanelProps> = ({ onSendToCalculator }) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const topics = ['all', 'Arithmetic', 'Algebra', 'Trigonometry', 'Calculus', 'Statistics', 'Finance'];

  const filteredQuizzes = PRACTICE_QUIZZES.filter(
    (q) => selectedTopic === 'all' || q.topic.toLowerCase() === selectedTopic.toLowerCase()
  );

  const activeQuestion = filteredQuizzes[currentIndex % filteredQuizzes.length];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);
    const isCorrect = selectedOption === activeQuestion.correctOptionIndex;
    setScore((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));
  };

  const handleNextQuestion = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredQuizzes.length);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setRevealedHints(0);
  };

  const handleRevealHint = () => {
    if (activeQuestion.hints && revealedHints < activeQuestion.hints.length) {
      setRevealedHints((prev) => prev + 1);
    }
  };

  return (
    <div id="practice-quiz-container" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-500" />
            Mathematical Practice & Quizzes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Test mathematical proficiency across arithmetic, algebra, calculus, and financial modeling
          </p>
        </div>

        {/* Score Tally */}
        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400">Score:</span>
          <span className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400">
            {score.correct} / {score.total}
          </span>
          {score.total > 0 && (
            <span className="text-xs font-semibold text-emerald-500">
              ({Math.round((score.correct / score.total) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Topic Filter */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => {
              setSelectedTopic(t);
              setCurrentIndex(0);
              setSelectedOption(null);
              setIsAnswerSubmitted(false);
              setRevealedHints(0);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
              selectedTopic === t
                ? 'bg-cyan-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Question Card */}
      {activeQuestion && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between text-xs">
            <span className="px-2.5 py-1 rounded-md font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/40">
              {activeQuestion.topic} • {activeQuestion.difficulty}
            </span>
            <span className="text-slate-400 font-mono">
              Question {currentIndex + 1} of {filteredQuizzes.length}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
            {activeQuestion.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {activeQuestion.options.map((opt, i) => {
              let btnStyle =
                'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:border-cyan-400';

              if (selectedOption === i) {
                btnStyle =
                  'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold ring-2 ring-cyan-500';
              }

              if (isAnswerSubmitted) {
                if (i === activeQuestion.correctOptionIndex) {
                  btnStyle =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                } else if (selectedOption === i) {
                  btnStyle =
                    'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold';
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(i)}
                  disabled={isAnswerSubmitted}
                  className={`w-full text-left p-4 rounded-2xl border text-sm transition-all flex items-center justify-between ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswerSubmitted && i === activeQuestion.correctOptionIndex && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  {isAnswerSubmitted && selectedOption === i && i !== activeQuestion.correctOptionIndex && (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Hints Section */}
          {activeQuestion.hints && activeQuestion.hints.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleRevealHint}
                  disabled={revealedHints >= activeQuestion.hints.length}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>
                    Need a hint? ({revealedHints}/{activeQuestion.hints.length} revealed)
                  </span>
                </button>
              </div>

              {revealedHints > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                  {activeQuestion.hints.slice(0, revealedHints).map((h, i) => (
                    <p key={i}>
                      <strong>Hint {i + 1}:</strong> {h}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Explanation if submitted */}
          {isAnswerSubmitted && (
            <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-200/70 dark:border-cyan-800 text-xs text-cyan-950 dark:text-cyan-200 space-y-1">
              <strong className="block text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                Derivation & Explanation:
              </strong>
              <p className="leading-relaxed">{activeQuestion.explanation}</p>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {!isAnswerSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="py-2.5 px-6 rounded-xl font-semibold text-xs bg-cyan-700 hover:bg-cyan-800 text-white disabled:opacity-50 shadow-xs transition-colors"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="py-2.5 px-6 rounded-xl font-semibold text-xs bg-cyan-700 hover:bg-cyan-800 text-white shadow-xs transition-colors flex items-center gap-2"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
