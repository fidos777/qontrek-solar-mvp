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
const PRICING = {
  small: 3.50,  // < 5kW: RM 3.50/watt
  medium: 3.25, // 5-10kW: RM 3.25/watt  
  large: 3.00   // > 10kW: RM 3.00/watt
};

const TNB_TARIFF = 0.57; // RM per kWh
const SUN_HOURS = 4.5;
const PANEL_WATTAGE = 550;

export class QuoteGenerator {
  generate(request: QuoteRequest): QuoteResult {
    // Calculate system size from bill
    const monthlyKwh = request.monthlyBill / TNB_TARIFF;
    const dailyKwh = monthlyKwh / 30;
    const systemSize = Math.ceil((dailyKwh / SUN_HOURS) * 2) / 2; // Round to 0.5kW
    
    // Panel count
    const panelCount = Math.ceil((systemSize * 1000) / PANEL_WATTAGE);
    
    // Price per watt
    const pricePerWatt = systemSize < 5 ? PRICING.small 
      : systemSize <= 10 ? PRICING.medium 
      : PRICING.large;
    
    // Total price
    const systemCost = systemSize * 1000 * pricePerWatt;
    const installCost = systemCost * 0.15;
    const permitCost = 500;
    const totalPrice = Math.round(systemCost + installCost + permitCost);
    
    // Savings
    const monthlyProduction = systemSize * SUN_HOURS * 30 * 0.85;
    const monthlySavings = Math.min(monthlyProduction * TNB_TARIFF, request.monthlyBill * 0.9);
    const yearlySavings = monthlySavings * 12;
    
    // Payback
    const paybackPeriod = totalPrice / yearlySavings;
    
    // Lifetime (25 years with degradation)
    let lifetime = 0;
    for (let y = 0; y < 25; y++) lifetime += yearlySavings * Math.pow(0.995, y);
    
    // CO2
    const co2Offset = Math.round(monthlyProduction * 12 * 0.78);
    
    return {
      id: generateId('quote'),
      request,
      systemSize,
      panelCount,
      pricePerWatt,
      totalPrice,
      estimatedSavings: {
        monthly: Math.round(monthlySavings),
        yearly: Math.round(yearlySavings),
        lifetime: Math.round(lifetime)
      },
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      co2Offset,
      generatedAt: Date.now(),
      status: 'draft'
    };
  }
}

// Solar Worker with Governance
export class SolarWorker {
  private quoteGen = new QuoteGenerator();
  private cfo: CFO;
  private classifier = getClassificationEngine();

  constructor(config: { monthlyBudget?: number } = {}) {
    this.cfo = new CFO({ monthlyBudget: config.monthlyBudget || 10000 });
  }

  async generateQuote(request: QuoteRequest): Promise<{
    quote: QuoteResult;
    classification: ClassificationResult;
    requiresConfirmation: boolean;
  }> {
    // Check vocabulary
    const vocabCheck = checkVocabulary(request.address);
    if (!vocabCheck.compliant) {
      console.warn('Vocabulary violations:', vocabCheck.violations);
    }
    
    // Generate quote
    const quote = this.quoteGen.generate(request);
    
    // Classify
    const classification = this.classifier.classify({
      actionType: 'generate_quote',
      userInput: `Generate quote for ${request.customerName}`,
      estimatedSpend: 0
    });
    
    // Log proof
    ProofLedger.log({
      type: 'quote_generated',
      timestamp: new Date(),
      actor: 'ai',
      action: 'generate_quote',
      classification,
      context: { quoteId: quote.id, customer: request.customerName }
    });
    
    return {
      quote,
      classification,
      requiresConfirmation: classification.type === 'B'
    };
  }

  async confirmQuote(quoteId: string): Promise<{ success: boolean; proofId: string }> {
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

// Exports
export { QuoteGenerator, SolarWorker };
export type { QuoteRequest, QuoteResult };
