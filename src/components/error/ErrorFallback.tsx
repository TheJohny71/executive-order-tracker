"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorFallbackProps {
  error: Error;
}

export const ErrorFallback = ({ error }: ErrorFallbackProps) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Error Loading Application</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          {error.message || 'Something went wrong. Please try again later.'}
        </p>
      </CardContent>
    </Card>
  </div>
);