import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { action } = req.body;
  
  if (action === 'import') {
    return res.status(200).json({ success: true, message: 'Imported 0 records (configure Jodoo credentials)' });
  }
  
  return res.status(400).json({ error: 'Invalid action' });
}
