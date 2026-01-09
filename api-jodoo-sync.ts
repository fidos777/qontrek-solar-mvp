// apps/solar-demo/src/pages/api/jodoo/sync.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createJodooSyncService } from '../../../lib/jodoo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    const syncService = createJodooSyncService();

    switch (action) {
      case 'import':
        // Import all records from Jodoo to Supabase
        const importResult = await syncService.importFromJodoo();
        return res.status(200).json({
          success: true,
          message: `Imported ${importResult.imported} records`,
          errors: importResult.errors,
        });

      case 'export':
        // Export single record to Jodoo
        const { deal } = req.body;
        const jodooId = await syncService.exportToJodoo(deal);
        return res.status(200).json({
          success: !!jodooId,
          jodoo_id: jodooId,
        });

      case 'sync':
        // Sync single record bidirectionally
        const { supabase_id, jodoo_id } = req.body;
        const syncResult = await syncService.syncRecord(supabase_id, jodoo_id);
        return res.status(200).json({
          success: syncResult,
        });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Jodoo sync error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
