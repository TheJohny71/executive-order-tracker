import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CONNECTION_TIMEOUT = 5000; // 5 seconds

type QueryEvent = {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
};

type LogEvent = {
  timestamp: Date;
  message: string;
  target?: string;
};

export class DatabaseClient {
  private static instance: PrismaClient | null = null;
  private static retryCount = 0;
  private static isConnecting = false;
  private static connectionPromise: Promise<void> | null = null;

  static async getInstance(): Promise<PrismaClient> {
    if (!this.instance) {
      await this.initialize();
    }
    return this.instance!;
  }

  private static async initialize(): Promise<void> {
    if (this.isConnecting) {
      if (this.connectionPromise) {
        await this.connectionPromise;
        return;
      }
    }

    this.isConnecting = true;
    this.connectionPromise = this.initializeClient();

    try {
      await Promise.race([
        this.connectionPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT)
        )
      ]);
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }

    this.isConnecting = false;
    this.connectionPromise = null;
  }

  private static async initializeClient(): Promise<void> {
    this.instance = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      errorFormat: 'minimal',
    });

    // Type-safe event handlers
    (this.instance as PrismaClient).$on<'query'>('query', (event: QueryEvent) => {
      logger.debug('Query: ' + event.query);
      logger.debug('Duration: ' + event.duration + 'ms');
    });

    (this.instance as PrismaClient).$on<'error'>('error', (event: LogEvent) => {
      logger.error('Prisma Error:', event.message);
    });

    (this.instance as PrismaClient).$on<'warn'>('warn', (event: LogEvent) => {
      logger.warn('Prisma Warning:', event.message);
    });

    // Add error handling middleware
    this.instance.$use(async (params, next) => {
      const startTime = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - startTime;
        
        if (duration > 1000) { // Log slow queries (>1s)
          logger.warn('Slow query detected:', {
            model: params.model,
            action: params.action,
            duration,
          });
        }
        
        return result;
      } catch (error) {
        if (this.isConnectionError(error)) {
          logger.warn('Database connection error, attempting to reconnect...');
          await this.reconnect();
          return next(params);
        }
        throw error;
      }
    });

    try {
      await this.instance.$connect();
      logger.info('Successfully connected to database');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  private static isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('closed') ||
      errorMessage.includes('ended') ||
      errorMessage.includes('terminated')
    );
  }

  static async reconnect(): Promise<void> {
    if (this.retryCount >= MAX_RETRIES) {
      this.retryCount = 0;
      throw new Error('Max reconnection attempts reached');
    }

    try {
      if (this.instance) {
        await this.instance.$disconnect();
        this.instance = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, this.retryCount)));
      
      await this.initialize();
      
      this.retryCount = 0;
      logger.info('Successfully reconnected to database');
    } catch (error) {
      this.retryCount++;
      logger.error(`Reconnection attempt ${this.retryCount} failed:`, error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      this.instance = null;
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const instance = await this.getInstance();
      await instance.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}