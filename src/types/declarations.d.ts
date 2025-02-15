// This file contains global type declarations
declare module '@/lib/*';
declare module '@/utils/*';
declare module '@/components/*';
declare module '@/config/*';

declare module '*.svg' {
  const content: any;
  export default content;
}

// Add type support for custom window properties
interface Window {
  fs: {
    readFile: (path: string, options?: { encoding?: string }) => Promise<Uint8Array | string>;
  };
}

// Add global type definitions
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}