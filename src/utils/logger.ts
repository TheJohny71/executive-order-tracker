type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

class Logger {
  private static formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };
  }

  private static log(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    
    // eslint-disable-next-line no-console
    switch (entry.level) {
      case 'error':
        console.error(prefix, entry.message, entry.data ?? '');
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.data ?? '');
        break;
      case 'debug':
        console.debug(prefix, entry.message, entry.data ?? '');
        break;
      default:
        console.log(prefix, entry.message, entry.data ?? '');
    }
  }

  public static info(message: string, data?: unknown): void {
    this.log(this.formatMessage('info', message, data));
  }

  public static warn(message: string, data?: unknown): void {
    this.log(this.formatMessage('warn', message, data));
  }

  public static error(message: string, data?: unknown): void {
    this.log(this.formatMessage('error', message, data));
  }

  public static debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = Logger;