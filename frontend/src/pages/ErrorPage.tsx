import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorPageProps {
  title?: string;
  message?: string;
  code?: number | string;
  onRetry?: () => void;
}

export default function ErrorPage({ 
  title = "Something went wrong", 
  message = "An unexpected error occurred. Please try again later.",
  code = 500,
  onRetry 
}: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="h-24 w-24 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-6">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        {code && <span className="inline-block px-3 py-1 rounded-full bg-muted text-sm font-medium text-muted-foreground">Error {code}</span>}
        <p className="text-muted-foreground max-w-[500px] mx-auto">
          {message}
        </p>
      </div>
      
      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload Page
        </Button>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}




