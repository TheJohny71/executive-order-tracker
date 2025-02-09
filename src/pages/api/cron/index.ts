// src/pages/api/cron/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { scheduler } from '@/lib/scheduler';
import { logger } from '@/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  // Optional: Check for secret token
  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get current scheduler status
    const status = scheduler.getStatus();
    
    if (!status.isRunning) {
      // Start the scheduler if it's not running
      await scheduler.start();
      logger.info('Scheduler started successfully');
    } else {
      // If already running, just trigger a manual check
      await scheduler.manualCheck();
      logger.info('Manual check triggered successfully');
    }
    
    // Get updated status after operations
    const updatedStatus = scheduler.getStatus();
    
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