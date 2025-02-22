'use client';

import type { FC } from 'react';

interface ErrorFallbackProps {
  error: Error;
}

export const ErrorFallback: FC<ErrorFallbackProps> = ({ error }) => {
  return (
    <div className="min-h-screen bg-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h1>
        <pre className="bg-white p-4 rounded-md text-red-600 overflow-auto">
          {error.message}
        </pre>
      </div>
    </div>
  );
};