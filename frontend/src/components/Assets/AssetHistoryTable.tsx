import { useState, useEffect, useRef, Fragment } from 'react';
import { ChevronDown, ChevronRight, History, Sparkles } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { type AuditLog } from '@/api/assets';

interface AssetHistoryTableProps {
  logs: AuditLog[];
  compact?: boolean;
  emptyMessage?: string;
  highlightedLogId?: string | null;
}

export function AssetHistoryTable({ 
  logs, 
  compact = false, 
  emptyMessage = "No history available.",
  highlightedLogId 
}: AssetHistoryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (highlightedLogId) {
      setExpandedRows(prev => {
        const next = new Set(prev);
        next.add(highlightedLogId);
        return next;
      });

      // Scroll into view after a brief delay to allow rendering
      setTimeout(() => {
        const row = rowRefs.current[highlightedLogId];
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('bg-primary/10'); // Highlight effect
          setTimeout(() => row.classList.remove('bg-primary/10'), 2000);
        }
      }, 100);
    }
  }, [highlightedLogId]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
        <History className="h-8 w-8 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {!compact && <TableHead className="w-[30px]"></TableHead>}
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>User</TableHead>
            {!compact && <TableHead>Changes Summary</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <Fragment key={log.id}>
              <TableRow 
                ref={(el) => { rowRefs.current[log.id] = el; }}
                className={!compact ? "cursor-pointer hover:bg-muted/50 transition-colors duration-500" : ""}
                onClick={() => !compact && toggleRow(log.id)}
              >
                {!compact && (
                  <TableCell>
                    {expandedRows.has(log.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.timestamp), compact ? 'MMM d, p' : 'PPpp')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-2">
                     <span className="text-sm text-muted-foreground">
                      {log.user_name || 'System'}
                     </span>
                     {log.origin === 'ai' && (
                        <Badge variant="secondary" className="px-1 py-0 h-5 text-[10px] gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-0">
                            <Sparkles className="w-3 h-3" />
                            AI
                        </Badge>
                     )}
                   </div>
                </TableCell>
                {!compact && (
                  <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                    {Object.keys(log.changes || {}).join(', ')}
                  </TableCell>
                )}
              </TableRow>
              {!compact && expandedRows.has(log.id) && (
                <TableRow key={`${log.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={5}>
                    <div className="p-4">
                      <h4 className="text-sm font-semibold mb-2">Change Details</h4>
                      <ScrollArea className="h-[200px] w-full rounded-md border bg-zinc-950 p-4">
                        <pre className="text-xs text-zinc-50 font-mono">
                          {JSON.stringify(log.changes || {}, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

