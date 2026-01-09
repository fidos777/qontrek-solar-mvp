import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { op, data } = req.body;
  console.log('Jodoo webhook:', op, data?._id);
  
  return res.status(200).json({ success: true });
}
