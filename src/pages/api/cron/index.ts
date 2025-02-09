// src/pages/api/cron/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { DocumentScheduler } from '@/lib/scheduler';
import { logger } from '@/utils/logger';

const scheduler = new DocumentScheduler(15); // Check every 15 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Perform an initial check for new documents
    await scheduler.manualCheck();
    
    // Start the scheduler if it's not already running
    scheduler.start();
    
    logger.info('Cron job executed successfully');
    return res.status(200).json({ success: true, message: 'Cron job executed successfully' });
  } catch (error) {
    logger.error('Error executing cron job:', error);
    return res.status(500).json({ error: 'Failed to execute cron job' });
  }
}