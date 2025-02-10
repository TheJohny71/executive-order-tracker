'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorFallbackProps {
  error: Error
}

export function ErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Error Loading Application</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            {error.message || 'Something went wrong. Please try again later.'}
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
              {error.stack}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}