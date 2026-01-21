import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6 animate-pulse">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      
      <h1 className="text-4xl font-bold tracking-tight mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-[500px]">
        Sorry, we couldn't find the page you're looking for. It might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      <div className="flex gap-4">
        <Button asChild variant="default">
          <Link to="/">Go Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="#" onClick={() => window.history.back()}>Go Back</Link>
        </Button>
      </div>
    </div>
  );
}




