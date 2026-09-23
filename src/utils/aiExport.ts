/**
 * AI Assistant Export & LaTeX Extraction Utilities
 * Provides Markdown conversation export and LaTeX formula extraction.
 */

import { AIMessage } from '../types';

/**
 * Extracts pure LaTeX syntax formula(s) from an AI message.
 * Inspects msg.formula, block math ($$...$$ or \[...\]), inline math ($...$), and expressions.
 */
export function extractLaTeXFormula(msg: AIMessage): string | null {
  if (msg.role !== 'assistant') return null;

  // 1. Explicit formula field returned by the AI provider
  if (msg.formula && msg.formula.trim()) {
    return msg.formula.trim();
  }

  const combinedText = [msg.content, ...(msg.steps || [])].join('\n');

  // 2. Block LaTeX expressions: $$ ... $$ or \[ ... \]
  const blockRegex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g;
  const blockFormulas: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(combinedText)) !== null) {
    const formula = (match[1] || match[2] || '').trim();
    if (formula) {
      blockFormulas.push(formula);
    }
  }

  if (blockFormulas.length > 0) {
    return blockFormulas.join('\n\n');
  }

  // 3. Inline LaTeX expressions: $ ... $ or \( ... \)
  const inlineRegex = /\$([^\$\n]+)\$|\\\(([\s\S]*?)\\\)/g;
  const inlineFormulas: string[] = [];
  while ((match = inlineRegex.exec(combinedText)) !== null) {
    const formula = (match[1] || match[2] || '').trim();
    // Exclude currency numbers (e.g. $15, $850.00)
    if (formula && !/^\d+(\.\d{2})?$/.test(formula)) {
      inlineFormulas.push(formula);
    }
  }

  if (inlineFormulas.length > 0) {
    return inlineFormulas.join('\n');
  }

  // 4. Calculator expression converted to LaTeX
  if (msg.expression && msg.expression.trim()) {
    return msg.expression
      .replace(/\*/g, ' \\cdot ')
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/\//g, ' \\div ');
  }

  return null;
}

/**
 * Generates a clean, comprehensive Markdown file representation of the entire conversation.
 */
export function generateConversationMarkdown(
  messages: AIMessage[],
  appTitle: string = 'CALCORA AI Mathematical Assistant'
): string {
  const exportDate = new Date();
  const dateFormatted = exportDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = exportDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const lines: string[] = [
    `# ${appTitle} — Conversation Export`,
    `**Exported Date:** ${dateFormatted} at ${timeFormatted}`,
    `**Total Messages:** ${messages.length}`,
    '',
    '> This document contains the full dialogue, mathematical explanations, and step derivations from your session.',
    '',
    '---',
    '',
  ];

  messages.forEach((msg, index) => {
    const msgTime = new Date(msg.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (msg.role === 'user') {
      lines.push(`### 👤 User (${msgTime})`);
      lines.push('');
      lines.push(msg.content.trim());
      lines.push('');
    } else {
      lines.push(`### 🤖 AI Mathematical Assistant (${msgTime})`);
      lines.push('');
      lines.push(msg.content.trim());
      lines.push('');

      // Mathematical Steps & Proof
      if (msg.steps && msg.steps.length > 0) {
        lines.push('#### Mathematical Steps & Proof');
        lines.push('');
        msg.steps.forEach((step, sIdx) => {
          lines.push(`${sIdx + 1}. ${step}`);
        });
        lines.push('');
      }

      // LaTeX Formula block if available
      const latex = extractLaTeXFormula(msg);
      if (latex) {
        lines.push('#### Formula (LaTeX)');
        lines.push('```latex');
        lines.push(latex);
        lines.push('```');
        lines.push('');
      }

      // Calculator Expression
      if (msg.expression) {
        lines.push(`**Calculator Expression:** \`${msg.expression}\``);
        lines.push('');
      }

      // Deterministic Engine Verification
      if (msg.isVerified) {
        lines.push(`*✅ ${msg.verificationNote || 'Verified by Calcora Deterministic Math Engine'}*`);
        lines.push('');
      }
    }

    if (index < messages.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });

  lines.push('');
  lines.push('---');
  lines.push('*Exported from Calcora Scientific Calculator & AI Mathematical Workbench*');

  return lines.join('\n');
}

/**
 * Triggers a browser download of a Markdown file.
 */
export function downloadMarkdownFile(content: string, filename?: string): void {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const actualFilename = filename || `calcora-math-conversation-${dateStr}-${timeStr}.md`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = actualFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to the clipboard with browser-fallback support.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to fallback
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
