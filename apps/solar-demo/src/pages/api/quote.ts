import type { NextApiRequest, NextApiResponse } from 'next';

// Simplified quote generation for API
function generateQuote(request: any) {
  const TNB_TARIFF = 0.57;
  const SUN_HOURS = 4.5;
  const PANEL_WATTAGE = 550;
  
  const monthlyKwh = request.monthlyBill / TNB_TARIFF;
  const dailyKwh = monthlyKwh / 30;
  const systemSize = Math.ceil((dailyKwh / SUN_HOURS) * 2) / 2;
  const panelCount = Math.ceil((systemSize * 1000) / PANEL_WATTAGE);
  const pricePerWatt = systemSize < 5 ? 3.50 : systemSize <= 10 ? 3.25 : 3.00;
  const systemCost = systemSize * 1000 * pricePerWatt;
  const totalPrice = Math.round(systemCost * 1.15 + 500);
  const monthlyProduction = systemSize * SUN_HOURS * 30 * 0.85;
  const monthlySavings = Math.min(monthlyProduction * TNB_TARIFF, request.monthlyBill * 0.9);
  const yearlySavings = monthlySavings * 12;
  const paybackPeriod = totalPrice / yearlySavings;
  
  let lifetime = 0;
  for (let y = 0; y < 25; y++) lifetime += yearlySavings * Math.pow(0.995, y);
  
  return {
    id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    co2Offset: Math.round(monthlyProduction * 12 * 0.78),
    generatedAt: Date.now(),
    status: 'draft'
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, request, quoteId } = req.body;

  if (action === 'generate') {
    const quote = generateQuote(request);
    const classification = {
      type: 'B' as const,
      reason: 'Quote generation requires confirmation',
      confidence: 0.95,
      timestamp: Date.now(),
      frozen: false
    };
    
    return res.json({
      quote,
      classification,
      requiresConfirmation: true
    });
  }

  if (action === 'confirm') {
    return res.json({
      success: true,
      proofId: `proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: 'Quote confirmed and sent'
    });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
