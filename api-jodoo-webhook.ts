// apps/solar-demo/src/pages/api/jodoo/webhook.ts
// Receives webhooks from Jodoo when data changes
import type { NextApiRequest, NextApiResponse } from 'next';
import { handleJodooWebhook, JodooWebhookPayload } from '../../../lib/jodoo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook (optional - add your own secret verification)
  const webhookSecret = req.headers['x-jodoo-webhook-secret'];
  if (process.env.JODOO_WEBHOOK_SECRET && webhookSecret !== process.env.JODOO_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload: JodooWebhookPayload = req.body;

    // Log the webhook
    console.log(`Jodoo webhook received: ${payload.op}`, payload.data._id);

    // Handle the webhook
    const success = await handleJodooWebhook(
      payload,
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );

    if (success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ success: false });
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Jodoo webhook payload format:
// {
//   "op": "data_create" | "data_update" | "data_remove" | "data_recover",
//   "data": {
//     "_id": "xxx",
//     "_widget_xxx": "value",
//     ...
//   }
// }
