/* Enhanced logger with debug level and better formatting */
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[DEBUG]', formatLogArgs(args));
    }
  },
  info: (...args: any[]) => {
    console.log('[INFO]', formatLogArgs(args));
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', formatLogArgs(args));
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', formatLogArgs(args));
  }
};

function formatLogArgs(args: any[]): any[] {
  return args.map(arg => {
    if (arg instanceof Error) {
      return {
        message: arg.message,
        stack: arg.stack,
        ...(arg as any)
      };
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        // Attempt to stringify with circular reference handling
        const seen = new WeakSet();
        return JSON.stringify(arg, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        }, 2);
      } catch (e) {
        return arg.toString();
      }
    }
    return arg;
  });
}