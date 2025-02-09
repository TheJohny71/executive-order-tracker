// src/pages/api/cron/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { documentScheduler } from '@/lib/scheduler'; // Fixed import path
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const status = documentScheduler.getStatus();
    
    if (!status.isRunning) {
      await documentScheduler.start();
      logger.info('Scheduler started successfully');
    } else {
      await documentScheduler.manualCheck();
      logger.info('Manual check triggered successfully');
    }
    
    const updatedStatus = documentScheduler.getStatus();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString(),
      status: {
        isRunning: updatedStatus.isRunning,
        lastRunTime: updatedStatus.lastRunTime?.toISOString(),
        errorCount: updatedStatus.errorCount,
        checkInterval: `${updatedStatus.interval / 60000} minutes`
      }
    });
  } catch (error) {
    logger.error('Error executing cron job:', error);
    return res.status(500).json({ 
      error: 'Failed to execute cron job',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}