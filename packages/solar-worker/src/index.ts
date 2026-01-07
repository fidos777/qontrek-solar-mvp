import { CFO, generateId, checkVocabulary, ProofLedger, ClassificationResult } from '@qontrek/core';
import { getClassificationEngine } from '@qontrek/civos';

// Quote Types
export interface QuoteRequest {
  customerName: string;
  phoneNumber: string;
  address: string;
  monthlyBill: number;
  roofType: 'concrete' | 'metal' | 'tile' | 'other';
  shading?: 'none' | 'partial' | 'heavy';
}

export interface QuoteResult {
  id: string;
  request: QuoteRequest;
  systemSize: number;
  panelCount: number;
  pricePerWatt: number;
  totalPrice: number;
  estimatedSavings: { monthly: number; yearly: number; lifetime: number };
  paybackPeriod: number;
  co2Offset: number;
  generatedAt: number;
  status: 'draft' | 'sent' | 'confirmed';
}

// Pricing (Malaysia Market)
const PRICING = { small: 3.50, medium: 3.25, large: 3.00 };
const TNB_TARIFF = 0.57;
const SUN_HOURS = 4.5;
const PANEL_WATTAGE = 550;

export class QuoteGenerator {
  generate(request: QuoteRequest): QuoteResult {
    const monthlyKwh = request.monthlyBill / TNB_TARIFF;
    const dailyKwh = monthlyKwh / 30;
    const systemSize = Math.ceil((dailyKwh / SUN_HOURS) * 2) / 2;
    const panelCount = Math.ceil((systemSize * 1000) / PANEL_WATTAGE);
    const pricePerWatt = systemSize < 5 ? PRICING.small : systemSize <= 10 ? PRICING.medium : PRICING.large;
    const systemCost = systemSize * 1000 * pricePerWatt;
    const totalPrice = Math.round(systemCost * 1.15 + 500);
    const monthlyProduction = systemSize * SUN_HOURS * 30 * 0.85;
    const monthlySavings = Math.min(monthlyProduction * TNB_TARIFF, request.monthlyBill * 0.9);
    const yearlySavings = monthlySavings * 12;
    const paybackPeriod = totalPrice / yearlySavings;
    let lifetime = 0;
    for (let y = 0; y < 25; y++) lifetime += yearlySavings * Math.pow(0.995, y);
    
    return {
      id: generateId('quote'),
      request,
      systemSize,
      panelCount,
      pricePerWatt,
      totalPrice,
      estimatedSavings: { monthly: Math.round(monthlySavings), yearly: Math.round(yearlySavings), lifetime: Math.round(lifetime) },
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      co2Offset: Math.round(monthlyProduction * 12 * 0.78),
      generatedAt: Date.now(),
      status: 'draft'
    };
  }
}

export class SolarWorker {
  private quoteGen = new QuoteGenerator();
  private cfo: CFO;
  private classifier = getClassificationEngine();

  constructor(config: { monthlyBudget?: number } = {}) {
    this.cfo = new CFO({ monthlyBudget: config.monthlyBudget || 10000 });
  }

  async generateQuote(request: QuoteRequest) {
    const vocabCheck = checkVocabulary(request.address);
    if (!vocabCheck.compliant) console.warn('Vocabulary violations:', vocabCheck.violations);
    
    const quote = this.quoteGen.generate(request);
    const classification = this.classifier.classify({
      actionType: 'generate_quote',
      userInput: `Generate quote for ${request.customerName}`,
      estimatedSpend: 0
    });
    
    ProofLedger.log({
      type: 'quote_generated',
      timestamp: new Date(),
      actor: 'ai',
      action: 'generate_quote',
      classification,
      context: { quoteId: quote.id, customer: request.customerName }
    });
    
    return { quote, classification, requiresConfirmation: classification.type === 'B' };
  }

  async confirmQuote(quoteId: string) {
    const proof = ProofLedger.log({
      type: 'quote_confirmed',
      timestamp: new Date(),
      actor: 'human',
      action: 'confirm_quote',
      context: { quoteId }
    });
    return { success: true, proofId: proof.id };
  }
}
