import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Download, Activity, ChevronDown, ChevronUp, Filter, DollarSign, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

import { 
  getReportStats, 
  getAuditLogs, 
  type AuditLog 
} from '@/api/reports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';

import { BudgetTab } from '@/components/Reports/BudgetTab';
import { ExportTab } from '@/components/Reports/ExportTab';

// Vibrant chart colors
const COLORS = [
  '#00BCD4', // Cyan
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#E91E63', // Pink
  '#03A9F4', // Light Blue
  '#FF5722', // Deep Orange
  '#673AB7', // Deep Purple
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('insights');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Stats Query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['report-stats'],
    queryFn: getReportStats
  });

  // Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    entity_type: 'all',
    start_date: '',
    end_date: ''
  });
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await getAuditLogs({
        page,
        size: pageSize,
        entity_type: filters.entity_type === 'all' ? undefined : filters.entity_type,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined
      });
      setLogs(res.items);
      setTotalLogs(res.total);
    } catch (error) {
      toast.error('Failed to fetch logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Initial fetch and page changes
  useEffect(() => {
    fetchLogs();
  }, [page]); 

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterClick = () => {
      if (page === 1) {
          fetchLogs();
      } else {
          setPage(1);
      }
  };

  const toggleRow = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Insights</h1>
          <p className="text-muted-foreground">System-wide activity logs, budget analysis, and data exports.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Insights & Logs
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Budget
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Data Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {/* Charts Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Activity Volume</CardTitle>
                <CardDescription>Actions performed over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  {stats?.activity_volume && stats.activity_volume.length > 0 ? (
                    <BarChart data={stats.activity_volume}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Actions" />
                    </BarChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No activity data for this period
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Action Distribution</CardTitle>
                <CardDescription>Top action types recorded</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {stats?.action_types && stats.action_types.length > 0 ? (
                    <PieChart>
                      <Pie
                        data={stats.action_types as any[]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.action_types.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No action types data
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Logs Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>System Audit Logs</CardTitle>
                <div className="flex gap-2">
                  <Select 
                    value={filters.entity_type} 
                    onValueChange={(v) => handleFilterChange('entity_type', v)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Entity Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      <SelectItem value="asset">Assets</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                      <SelectItem value="auth">Auth</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <DateRangePicker 
                    className="w-[300px]"
                    date={{
                      from: filters.start_date ? new Date(filters.start_date + 'T00:00:00') : undefined,
                      to: filters.end_date ? new Date(filters.end_date + 'T00:00:00') : undefined
                    }}
                    onDateChange={(range) => {
                      setFilters(prev => ({
                        ...prev,
                        start_date: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
                        end_date: range?.to ? format(range.to, 'yyyy-MM-dd') : ''
                      }));
                    }}
                  />

                  <Button variant="outline" size="icon" onClick={handleFilterClick}>
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 && !loadingLogs && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No logs found.
                      </TableCell>
                    </TableRow>
                  )}
                  {logs.map((log) => (
                    <>
                      <TableRow 
                        key={log.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(log.id)}
                      >
                        <TableCell>
                          {expandedLogId === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {format(new Date(log.timestamp), 'MMM dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="capitalize text-sm font-medium">{log.entity_type}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={log.entity_name || log.entity_id}>
                              {log.entity_name || log.entity_id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Resolve user name ideally, or show ID */}
                          <div className="flex items-center gap-2">
                             <span>{log.user_name || 'System'}</span>
                             {log.origin === 'ai' && (
                                <Badge variant="secondary" className="px-1 py-0 h-5 text-[10px] gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-0">
                                    <Sparkles className="w-3 h-3" />
                                    AI
                                </Badge>
                             )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-muted-foreground">
                          {Object.keys(log.changes || {}).length > 0 
                            ? `Changed: ${Object.keys(log.changes || {}).join(', ')}`
                            : 'No changes recorded'}
                        </TableCell>
                      </TableRow>
                      {expandedLogId === log.id && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={6}>
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-semibold mb-2">Metadata</h4>
                                  <div className="space-y-1 text-muted-foreground">
                                    <p><span className="font-medium text-foreground">Log ID:</span> {log.id}</p>
                                    <p><span className="font-medium text-foreground">Entity:</span> {log.entity_name || log.entity_id}</p>
                                    <p><span className="font-medium text-foreground">User:</span> {log.user_name || log.user_id || 'N/A'}</p>
                                    <p><span className="font-medium text-foreground">Origin:</span> {log.origin || 'human'}</p>
                                    <p><span className="font-medium text-foreground">Timestamp:</span> {format(new Date(log.timestamp), 'PPpp')}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Changes</h4>
                                  {log.changes && Object.keys(log.changes).length > 0 ? (
                                    <div className="rounded-md border bg-muted/50 p-2 font-mono text-xs overflow-auto max-h-[200px]">
                                      <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground italic">No specific changes recorded in this log entry.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loadingLogs}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} of {Math.max(1, Math.ceil(totalLogs / pageSize))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(totalLogs / pageSize) || loadingLogs}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <BudgetTab />
        </TabsContent>

        <TabsContent value="export">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
