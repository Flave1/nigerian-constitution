import type { NextApiRequest, NextApiResponse } from 'next';
import { getAIResponse } from '../../lib/ai-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    const response = await getAIResponse(message);
    
    // Return JSON response instead of streaming for now
    res.status(200).json({ reply: response });
  } catch (error) {
    console.error('Error in chat API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 