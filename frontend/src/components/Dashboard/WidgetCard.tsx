import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  onRemove?: () => void;
  // Props passed by react-grid-layout
  style?: React.CSSProperties;
  onMouseDown?: React.MouseEventHandler;
  onMouseUp?: React.MouseEventHandler;
  onTouchEnd?: React.TouchEventHandler;
  // ... other props passed by RGL
  [key: string]: any; 
}

export default function WidgetCard({ 
  title, 
  children, 
  className, 
  contentClassName,
  onRemove,
  style, 
  onMouseDown, 
  onMouseUp, 
  onTouchEnd,
  ...props 
}: WidgetCardProps) {
  return (
    <Card 
      className={cn("h-full flex flex-col border-border/40 shadow-sm bg-card/50 backdrop-blur-sm group/card overflow-hidden", className)} 
      style={style}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      <CardHeader className={cn(
        "py-4 px-5 cursor-move draggable-handle pb-2 flex flex-row items-center justify-between space-y-0",
        !title && "py-2 min-h-[40px]" 
      )}>
        <CardTitle className="text-base font-semibold text-foreground truncate">
          {title}
        </CardTitle>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2 opacity-0 group-hover/card:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onMouseDown={(e) => e.stopPropagation()} 
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn("flex-1 p-5 overflow-auto pt-2", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
