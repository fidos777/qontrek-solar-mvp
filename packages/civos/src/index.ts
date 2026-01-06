import type { ClassificationType, ClassificationResult, CFODecision } from '@qontrek/core';

// Classification Rules
const TYPE_A_PATTERNS = [/\b(what|how|tell me|explain|info|help|\?)\b/i];
const TYPE_B_PATTERNS = [/\b(generate|create|send|quote|message)\b/i];
const TYPE_C_PATTERNS = [/\b(pay|payment|contract|sign|delete|remove)\b/i];

// Spend thresholds
const SPEND_THRESHOLDS = { A: 100, B: 1000 };

export class ClassificationEngine {
  private frictionPhase: 'phase_1' | 'phase_2' | 'phase_3' = 'phase_1';

  classify(context: {
    actionType?: string;
    userInput?: string;
    estimatedSpend?: number;
  }): ClassificationResult {
    const text = `${context.actionType || ''} ${context.userInput || ''}`.toLowerCase();
    const spend = context.estimatedSpend || 0;
    
    let type: ClassificationType = 'B'; // Default
    let reason = 'Default classification';
    let confidence = 0.5;
    
    // Check Type C first (highest priority)
    if (TYPE_C_PATTERNS.some(p => p.test(text)) || spend > SPEND_THRESHOLDS.B) {
      type = 'C';
      reason = spend > SPEND_THRESHOLDS.B 
        ? `High value: MYR ${spend.toLocaleString()} exceeds threshold`
        : 'Payment/contract action detected';
      confidence = 0.95;
    }
    // Check Type B
    else if (TYPE_B_PATTERNS.some(p => p.test(text)) || spend > SPEND_THRESHOLDS.A) {
      type = 'B';
      reason = 'Generate/send action requires confirmation';
      confidence = 0.76;
    }
    // Check Type A
    else if (TYPE_A_PATTERNS.some(p => p.test(text)) || spend === 0) {
      type = 'A';
      reason = 'Information query - auto execute';
      confidence = 1.0;
    }
    
    return {
      type,
      confidence,
      reason,
      timestamp: Date.now(),
      frozen: false
    };
  }

  classifyWithCFO(context: any, cfoDecision: CFODecision): ClassificationResult {
    const base = this.classify(context);
    
    // CFO can escalate but not downgrade
    if (cfoDecision.suggestedType === 'C' && base.type !== 'C') {
      return { ...base, type: 'C', reason: `${base.reason}. CFO override: budget exceeded` };
    }
    if (cfoDecision.suggestedType === 'B' && base.type === 'A') {
      return { ...base, type: 'B', reason: `${base.reason}. CFO override: near budget limit` };
    }
    
    return base;
  }

  setFrictionPhase(phase: 'phase_1' | 'phase_2' | 'phase_3') {
    this.frictionPhase = phase;
  }

  getConfirmationDelay(): number {
    return this.frictionPhase === 'phase_1' ? 1 : this.frictionPhase === 'phase_2' ? 2 : 3;
  }
}

// CIVOS Lock Statements (INVARIANTS)
export const CIVOS_INVARIANTS = {
  CLASSIFICATION_TYPES: ['A', 'B', 'C'] as const,
  PRIORITY: 'C > B > A (most restrictive wins)',
  TYPE_A: 'AUTO - AI executes without confirmation',
  TYPE_B: 'CONFIRM - Requires human confirmation with delay',
  TYPE_C: 'HOLD - AI silent, human must decide',
  SPEND_THRESHOLDS: { A: 100, B: 1000 },
  FROZEN: 'v1.0.0 - No modifications allowed'
};

// Singleton
let engine: ClassificationEngine | null = null;
export function getClassificationEngine(): ClassificationEngine {
  if (!engine) engine = new ClassificationEngine();
  return engine;
}

export { ClassificationType, ClassificationResult } from '@qontrek/core';
