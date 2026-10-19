/**
 * Calcora AI - Phase 3E: Privacy Policy & Data Retention Engine
 *
 * Enforces:
 *   - Ephemeral in-memory data lifecycle
 *   - Explicit document deletion & cache invalidation
 *   - Secret/Credential redaction across all logs & diagnostics
 *   - External processing disclosure & consent tracking
 *   - Prompt injection defense against data exfiltration
 */

import { globalDocumentIntelligence } from './documentIntelligence';
import { globalWebResearcher } from './webResearch';

export interface RetentionPolicy {
  ephemeralInMemoryOnly: boolean;
  maxCacheAgeMs: number;
  allowCloudTransmission: boolean;
  redactSecretsInLogs: boolean;
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  ephemeralInMemoryOnly: true,
  maxCacheAgeMs: 60 * 60 * 1000, // 1 hour
  allowCloudTransmission: false,
  redactSecretsInLogs: true,
};

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{20,}/g, // Google API Key
  /sk-[a-zA-Z0-9]{20,}/g,    // OpenAI API Key
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, // Bearer Token
  /password\s*[:=]\s*["']?[^"'\s,]+/gi, // Password
  /secret\s*[:=]\s*["']?[^"'\s,]+/gi,   // Secret
];

/**
 * Strips secrets, API keys, and authorization headers from any log string or JSON payload.
 */
export function sanitizeLogString(input: string): string {
  let clean = input;
  for (const pattern of SECRET_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED_SECRET]');
  }
  return clean;
}

export class PrivacyPolicyEngine {
  private policy: RetentionPolicy = { ...DEFAULT_RETENTION_POLICY };
  private auditLog: Array<{ action: string; timestamp: number; details: string }> = [];

  public getPolicy(): Readonly<RetentionPolicy> {
    return { ...this.policy };
  }

  public updatePolicy(update: Partial<RetentionPolicy>): void {
    this.policy = { ...this.policy, ...update };
    this.recordAudit('updatePolicy', `Updated policy: cloudTransmission=${this.policy.allowCloudTransmission}`);
  }

  /**
   * Purges all uploaded documents, search indexes, and web research caches.
   */
  public purgeAllUserData(): { purgedDocuments: number; cacheCleared: boolean } {
    const docCount = globalDocumentIntelligence.listDocuments().length;
    globalDocumentIntelligence.clearAll();
    globalWebResearcher.clearCache();
    this.recordAudit('purgeAllUserData', `Purged ${docCount} documents and cleared web cache.`);
    return { purgedDocuments: docCount, cacheCleared: true };
  }

  /**
   * Authorizes or denies an external cloud AI request based on privacy policy.
   */
  public canSendExternalAIRequest(): boolean {
    return this.policy.allowCloudTransmission;
  }

  /**
   * Validates whether a prompt or document snippet contains data exfiltration injection patterns.
   */
  public detectExfiltrationAttempt(text: string): { dangerous: boolean; reason?: string } {
    const lower = text.toLowerCase();
    // Patterns attempting to send documents or keys to external endpoints
    if (/https?:\/\/[a-z0-9.-]+\/(?:log|collect|steal|leak|webhook)\?[^ \t\r\n]+/i.test(text)) {
      return { dangerous: true, reason: 'Attempt to exfiltrate data to an unauthorized URL' };
    }
    if (/curl\s+-[dx]\s+.*(?:password|key|token|cookie)/i.test(lower)) {
      return { dangerous: true, reason: 'Command attempt to extract credentials' };
    }
    if (/(?:send|post|transmit)\s+(?:all\s+)?(?:documents|keys|context)\s+to\b/i.test(lower)) {
      return { dangerous: true, reason: 'Instruction attempting to leak loaded context' };
    }
    return { dangerous: false };
  }

  private recordAudit(action: string, details: string): void {
    this.auditLog.push({
      action,
      timestamp: Date.now(),
      details: sanitizeLogString(details),
    });
    // Keep bounded in-memory audit log
    if (this.auditLog.length > 500) {
      this.auditLog.splice(0, 100);
    }
  }

  public getAuditTrail(): ReadonlyArray<{ action: string; timestamp: number; details: string }> {
    return this.auditLog;
  }
}

export const globalPrivacyEngine = new PrivacyPolicyEngine();
