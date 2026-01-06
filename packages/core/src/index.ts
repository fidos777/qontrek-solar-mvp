// Types
export type ClassificationType = 'A' | 'B' | 'C';
export type CFOStatus = 'GREEN' | 'YELLOW' | 'RED';
export type FrictionPhase = 'phase_1' | 'phase_2' | 'phase_3';

export interface ClassificationResult {
  type: ClassificationType;
  confidence: number;
  reason: string;
  timestamp: number;
  frozen: boolean;
}

export interface CFODecision {
  status: CFOStatus;
  spendRatio: number;
  suggestedType: ClassificationType;
}

// CFO - Financial oversight
export class CFO {
  private monthlyBudget: number;
  private currentSpend: number = 0;

  constructor(config: { monthlyBudget: number }) {
    this.monthlyBudget = config.monthlyBudget;
  }

  check(amount: number): CFODecision {
    const newSpend = this.currentSpend + amount;
    const ratio = newSpend / this.monthlyBudget;
    
    let status: CFOStatus;
    let suggestedType: ClassificationType;
    
    if (ratio <= 0.95) {
      status = 'GREEN';
      suggestedType = amount <= 100 ? 'A' : 'B';
    } else if (ratio <= 1.05) {
      status = 'YELLOW';
      suggestedType = 'B';
    } else {
      status = 'RED';
      suggestedType = 'C';
    }
    
    return { status, spendRatio: ratio, suggestedType };
  }

  recordSpend(amount: number): void {
    this.currentSpend += amount;
  }

  getSummary() {
    return {
      monthly_budget: this.monthlyBudget,
      current_spend: this.currentSpend,
      remaining: this.monthlyBudget - this.currentSpend,
      status: this.check(0).status
    };
  }
}

// Vocabulary Guard
const FORBIDDEN_TERMS = [
  { pattern: /\bguarantee[sd]?\b/gi, reason: 'Cannot guarantee outcomes' },
  { pattern: /\bpromise\s+savings?\b/gi, reason: 'Cannot promise specific savings' },
  { pattern: /\blegal\s+advice\b/gi, reason: 'Cannot provide legal advice' }
];

export function checkVocabulary(text: string): { compliant: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const term of FORBIDDEN_TERMS) {
    if (term.pattern.test(text)) {
      violations.push(term.reason);
    }
  }
  return { compliant: violations.length === 0, violations };
}

// Event Bus
type EventHandler = (data: any) => void;
const handlers = new Map<string, Set<EventHandler>>();

export const EventBus = {
  on(event: string, handler: EventHandler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
  },
  emit(event: string, data: any) {
    handlers.get(event)?.forEach(h => h(data));
  }
};

// Proof Ledger
export interface ProofEntry {
  id: string;
  type: string;
  timestamp: Date;
  actor: 'ai' | 'human' | 'system';
  action: string;
  classification?: ClassificationResult;
  context?: Record<string, unknown>;
}

const proofEntries: ProofEntry[] = [];

export const ProofLedger = {
  log(entry: Omit<ProofEntry, 'id'>): ProofEntry {
    const full: ProofEntry = { ...entry, id: `proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    proofEntries.push(full);
    return full;
  },
  getAll: () => [...proofEntries]
};

// Helpers
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
