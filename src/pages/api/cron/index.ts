// src/pages/api/cron/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { documentScheduler } from '@/scheduler/documentScheduler'; 
  // or '@/lib/scheduler/documentScheduler' 
  // Make sure this path matches where you put the file!

import { logger } from '@/utils/logger';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', allowedMethods: ['POST'] });
  }

  // Optional: check a secret if you want
  // const cronSecret = req.headers['x-cron-secret'];
  // if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    // Example usage: if it's already running, do a manual check
    const status = documentScheduler.getStatus();
    if (status.isRunning) {
      documentScheduler.manualCheck()
        .then(() => {
          logger.info('Manual check triggered successfully.');
        })
        .catch((err) => {
          logger.error('Error in manualCheck:', err);
        });
    } else {
      documentScheduler.start();
      logger.info('Scheduler started successfully.');
    }

    const updatedStatus = documentScheduler.getStatus();

    return res.status(200).json({
      success: true,
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString(),
      status: {
        isRunning: updatedStatus.isRunning,
        lastCheckTime: updatedStatus.lastCheckTime,
        consecutiveFailures: updatedStatus.consecutiveFailures,
      },
    });
  } catch (error) {
    logger.error('Error executing cron job:', error);
    return res.status(500).json({
      error: 'Failed to execute cron job',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}
