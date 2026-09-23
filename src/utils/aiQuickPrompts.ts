/**
 * AI Quick Prompt Configuration & Generators
 * Provides pre-engineered prompts for rapid mathematical inquiry.
 */

import { AIMessage } from '../types';

export type QuickPromptType =
  | 'explain-step'
  | 'check-errors'
  | 'simplify'
  | 'solve-step-by-step'
  | 'alternative';

export interface QuickPromptContext {
  inputPrompt?: string;
  currentExpression?: string;
  currentResult?: string;
  targetStep?: string;
  lastAssistantMessage?: AIMessage;
}

export interface QuickPromptItem {
  id: QuickPromptType;
  label: string;
  description: string;
  badge?: string;
}

export const QUICK_PROMPT_ITEMS: QuickPromptItem[] = [
  {
    id: 'explain-step',
    label: 'Explain this step',
    description: 'Deconstruct the mathematical derivation and principles behind a step',
    badge: 'Tutor',
  },
  {
    id: 'check-errors',
    label: 'Check for errors',
    description: 'Audit calculations for sign mistakes, domain errors, and arithmetic slips',
    badge: 'Audit',
  },
  {
    id: 'simplify',
    label: 'Simplify expression',
    description: 'Combine like terms, factor, and reduce to simplest canonical form',
    badge: 'Algebra',
  },
  {
    id: 'solve-step-by-step',
    label: 'Solve step-by-step',
    description: 'Step-by-step breakdown from start to finish with proof',
    badge: 'Solve',
  },
  {
    id: 'alternative',
    label: 'Alternative method',
    description: 'Explore a different mathematical method to verify or solve',
    badge: 'Insight',
  },
];

/**
 * Builds a context-aware prompt string for instant submission to the AI model.
 */
export function buildQuickPrompt(type: QuickPromptType, context: QuickPromptContext = {}): string {
  const { inputPrompt, currentExpression, currentResult, targetStep, lastAssistantMessage } = context;
  const userTyped = inputPrompt?.trim();

  switch (type) {
    case 'explain-step': {
      if (targetStep && targetStep.trim()) {
        return `Please explain this step in detail and break down the underlying mathematical rules and intuition:\n"${targetStep.trim()}"`;
      }
      if (userTyped) {
        return `Please explain this mathematical step in detail: ${userTyped}`;
      }
      if (currentExpression && currentExpression.trim()) {
        return `Please explain each step required to evaluate or solve: ${currentExpression.trim()}`;
      }
      if (lastAssistantMessage?.steps && lastAssistantMessage.steps.length > 0) {
        return `Please explain the key steps in your previous solution in more detail, showing the underlying algebraic or geometric intuition.`;
      }
      return `Please explain this step in detail, clarifying the mathematical formulas and theorems applied.`;
    }

    case 'check-errors': {
      if (userTyped) {
        return `Please check this calculation and mathematical reasoning for any errors, sign mistakes, or false assumptions:\n${userTyped}`;
      }
      if (currentExpression && currentExpression.trim()) {
        const eq = currentResult
          ? `${currentExpression.trim()} = ${currentResult.trim()}`
          : currentExpression.trim();
        return `Please check this calculation for errors, edge cases, and arithmetic accuracy: ${eq}`;
      }
      if (lastAssistantMessage) {
        return `Please audit our previous calculation and derivation. Are there any false assumptions, sign errors, domain restrictions, or rounding issues?`;
      }
      return `Please check this mathematical derivation for errors, edge cases, and common pitfalls.`;
    }

    case 'simplify': {
      if (userTyped) {
        return `Simplify this expression step-by-step to its simplest canonical form:\n${userTyped}`;
      }
      if (currentExpression && currentExpression.trim()) {
        return `Simplify this expression step-by-step to its simplest canonical form: ${currentExpression.trim()}`;
      }
      return `Simplify this mathematical expression step-by-step: combine like terms, apply algebraic identities, and reduce to lowest terms.`;
    }

    case 'solve-step-by-step': {
      if (userTyped) {
        return `Solve this problem step-by-step with clear algebraic derivations:\n${userTyped}`;
      }
      if (currentExpression && currentExpression.trim()) {
        return `Solve step-by-step with full working: ${currentExpression.trim()}`;
      }
      return `Solve this problem step-by-step with clear mathematical derivations and justifications.`;
    }

    case 'alternative': {
      if (userTyped) {
        return `Can you demonstrate an alternative mathematical method or approach to solve:\n${userTyped}`;
      }
      if (currentExpression && currentExpression.trim()) {
        return `Can you show an alternative mathematical method to solve: ${currentExpression.trim()}?`;
      }
      return `Can you demonstrate an alternative mathematical method or approach to verify or solve this problem?`;
    }

    default:
      return userTyped || 'Help me solve this mathematical problem.';
  }
}
