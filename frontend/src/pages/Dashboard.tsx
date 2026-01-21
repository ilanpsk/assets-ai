import { useState, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserDashboard } from '@/components/Dashboard/UserDashboard';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetCard from '@/components/Dashboard/WidgetCard';
import { Button } from '@/components/ui/button';
import { 
  Settings2, Plus, Loader2, 
  Activity, Box, UserPlus, LogOut, Sparkles,
  DollarSign, CheckCircle2, AlertTriangle, ListPlus
} from 'lucide-react';
import { getDashboardStats } from '@/api/dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AddWidgetDialog } from '@/components/Dashboard/AddWidgetDialog';
import type { WidgetDefinition } from '@/components/Dashboard/AddWidgetDialog';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Extended layout with more granular widgets
const defaultLayouts = {
  lg: [
    { i: 'stat-total', x: 0, y: 0, w: 3, h: 3 },
    { i: 'stat-value', x: 3, y: 0, w: 3, h: 3 },
    { i: 'stat-available', x: 6, y: 0, w: 3, h: 3 },
    { i: 'stat-maintenance', x: 9, y: 0, w: 3, h: 3 },
    { i: 'main-chart', x: 0, y: 3, w: 8, h: 10 },
    { i: 'status-chart', x: 8, y: 3, w: 4, h: 5 },
    { i: 'actions', x: 8, y: 8, w: 4, h: 5 },
    { i: 'activity', x: 0, y: 13, w: 12, h: 6 },
  ],
  md: [
    { i: 'stat-total', x: 0, y: 0, w: 5, h: 3 },
    { i: 'stat-value', x: 5, y: 0, w: 5, h: 3 },
    { i: 'stat-available', x: 0, y: 3, w: 5, h: 3 },
    { i: 'stat-maintenance', x: 5, y: 3, w: 5, h: 3 },
    { i: 'main-chart', x: 0, y: 6, w: 10, h: 8 },
    { i: 'status-chart', x: 0, y: 14, w: 5, h: 6 },
    { i: 'actions', x: 5, y: 14, w: 5, h: 6 },
    { i: 'activity', x: 0, y: 20, w: 10, h: 6 },
  ],
};

// Vibrant chart colors for IT dashboards
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

const formatLabel = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl">
        <p className="font-semibold mb-1">{formatLabel(label)}</p>
        <p className="text-primary text-sm">
          {payload[0].value} Assets
        </p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-card border border-border px-3 py-2 rounded-lg shadow-lg">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="font-medium text-foreground">{data.name}</span>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {data.value.toLocaleString()} assets
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();
  
  const [isEditable, setIsEditable] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  
  const [layouts, setLayouts] = useState(() => {
    // Force layout update for new widget
    const saved = localStorage.getItem('dashboard-layout-v4');
    return saved ? JSON.parse(saved) : defaultLayouts;
  });

  const [userWidgets, setUserWidgets] = useState<{id: string, defId: string, title: string, config?: any}[]>(() => {
     const saved = localStorage.getItem('dashboard-widgets-v1');
     return saved ? JSON.parse(saved) : [];
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const existingDefIds = useMemo(() => {
     const dynamic = userWidgets.map(w => w.defId);
     const layoutKeys = layouts.lg?.map((l: any) => l.i) || [];
     const hardcoded = ['stat-maintenance'];
     const presentHardcoded = hardcoded.filter(id => layoutKeys.includes(id));
     return [...new Set([...dynamic, ...presentHardcoded])];
  }, [userWidgets, layouts]);

  const onLayoutChange = (_layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('dashboard-layout-v4', JSON.stringify(allLayouts));
  };

  const handleAddWidget = (def: WidgetDefinition, config?: any) => {
     const newId = `widget-${Date.now()}`;
     const newWidget = { id: newId, defId: def.id, title: def.title, config };
     const updatedWidgets = [...userWidgets, newWidget];
     setUserWidgets(updatedWidgets);
     localStorage.setItem('dashboard-widgets-v1', JSON.stringify(updatedWidgets));

     // Add to layout
     const newLayouts = { ...layouts };
     const newItem = { i: newId, x: 0, y: Infinity, w: def.defaultW, h: def.defaultH };
     
     // Ensure we update all existing breakpoints
     Object.keys(newLayouts).forEach(bp => {
        newLayouts[bp] = [...(newLayouts[bp] || []), newItem];
     });
     
     // Also ensure we have at least 'lg' populated if somehow empty
     if (!newLayouts.lg) {
        newLayouts.lg = [newItem];
     }
     
     setLayouts(newLayouts);
     localStorage.setItem('dashboard-layout-v4', JSON.stringify(newLayouts));
  };

  const handleRemoveWidget = (widgetId: string) => {
    const updatedWidgets = userWidgets.filter(w => w.id !== widgetId);
    setUserWidgets(updatedWidgets);
    localStorage.setItem('dashboard-widgets-v1', JSON.stringify(updatedWidgets));

    // Remove from layout
    const newLayouts = { ...layouts };
    Object.keys(newLayouts).forEach(bp => {
       newLayouts[bp] = newLayouts[bp].filter((l: any) => l.i !== widgetId);
    });
    setLayouts(newLayouts);
    localStorage.setItem('dashboard-layout-v4', JSON.stringify(newLayouts));
  };

  const chartData = useMemo(() => stats?.type_counts
    ? Object.entries(stats.type_counts).map(([name, value]) => ({ name, value }))
    : [], [stats]);

  const statusData = useMemo(() => stats?.status_counts
    ? Object.entries(stats.status_counts).map(([name, value]) => ({ name: formatLabel(name), value }))
    : [], [stats]);
  
  const locationData = useMemo(() => stats?.location_counts
    ? Object.entries(stats.location_counts).map(([name, value]) => ({ name, value }))
    : [], [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If regular user (cannot view all assets), show User Dashboard
  if (!hasPermission('asset:view_all')) {
    return <UserDashboard />;
  }

  // Helper for fuzzy finding counts
  const getStatusCount = (key: string) => {
    if (!stats?.status_counts) return 0;
    // Try exact match
    if (stats.status_counts[key] !== undefined) return stats.status_counts[key];
    // Try normalized keys
    const lowerKey = key.toLowerCase();
    const found = Object.keys(stats.status_counts).find(k => k.toLowerCase().replace(/_/g, ' ') === lowerKey || k.toLowerCase() === lowerKey);
    return found ? stats.status_counts[found] : 0;
  };

  // Helper for small stat cards
  const StatWidget = ({ title, value, icon: Icon, colorClass, trend }: any) => (
    <div className="flex flex-col h-full justify-between p-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
        </div>
        <div className={cn("p-2 rounded-xl bg-opacity-10", colorClass.replace('text-', 'bg-'))}>
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>
      </div>
    </div>
  );

  const isWidgetInLayout = (id: string) => {
    return layouts.lg?.some((l: any) => l.i === id);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Mission Control
          </h1>
          <p className="text-muted-foreground mt-1">Overview of your asset infrastructure.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant={isEditable ? "default" : "secondary"}
            size="sm"
            onClick={() => setIsEditable(!isEditable)}
            className="transition-all duration-300"
          >
            <Settings2 className={cn("mr-2 h-4 w-4", isEditable && "animate-spin")} />
            {isEditable ? 'Save Layout' : 'Customize View'}
          </Button>
          {isEditable && (
            <Button size="sm" onClick={() => setShowAddWidget(true)} className="animate-in fade-in zoom-in">
              <Plus className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          )}
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={40}
        isDraggable={isEditable}
        isResizable={isEditable}
        onLayoutChange={onLayoutChange}
        draggableHandle=".draggable-handle"
        margin={[16, 16]}
      >
        {/* STAT: TOTAL ASSETS */}
        {isWidgetInLayout('stat-total') && (
        <div key="stat-total">
          <WidgetCard 
             title="" 
             className="bg-gradient-to-br from-card to-card/50 border-primary/10"
             contentClassName="p-1 overflow-hidden"
             onRemove={isEditable ? () => handleRemoveWidget('stat-total') : undefined}
           >
            <StatWidget 
              title="Total Assets" 
              value={stats?.total_assets || 0} 
              icon={Box} 
              colorClass="text-primary"
            />
          </WidgetCard>
        </div>
        )}

        {/* STAT: TOTAL VALUE */}
        {isWidgetInLayout('stat-value') && (
        <div key="stat-value">
           <WidgetCard 
             title="" 
             className="bg-gradient-to-br from-card to-card/50 border-emerald-500/10"
             contentClassName="p-1 overflow-hidden"
             onRemove={isEditable ? () => handleRemoveWidget('stat-value') : undefined}
           >
            <StatWidget 
              title="Total Value" 
              value={stats?.total_value ? `$${stats.total_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'} 
              icon={DollarSign} 
              colorClass="text-emerald-500"
            />
          </WidgetCard>
        </div>
        )}

        {/* STAT: IN USE */}
        {isWidgetInLayout('stat-active') && (
        <div key="stat-active">
           <WidgetCard 
             title="" 
             className="bg-gradient-to-br from-card to-card/50 border-green-500/10"
             contentClassName="p-1 overflow-hidden"
             onRemove={isEditable ? () => handleRemoveWidget('stat-active') : undefined}
           >
            <StatWidget 
              title="Active Deployments" 
              value={getStatusCount('In Use') || getStatusCount('in_use') || getStatusCount('deployed') || getStatusCount('active')} 
              icon={Activity} 
              colorClass="text-green-500"
            />
          </WidgetCard>
        </div>
        )}

        {/* STAT: AVAILABLE */}
        {isWidgetInLayout('stat-available') && (
        <div key="stat-available">
           <WidgetCard 
             title="" 
             className="bg-gradient-to-br from-card to-card/50 border-blue-500/10"
             contentClassName="p-1 overflow-hidden"
             onRemove={isEditable ? () => handleRemoveWidget('stat-available') : undefined}
           >
            <StatWidget 
              title="Ready to Deploy" 
              value={getStatusCount('Available') || getStatusCount('available') || getStatusCount('in_stock')} 
              icon={CheckCircle2} 
              colorClass="text-blue-500"
            />
          </WidgetCard>
        </div>
        )}

        {/* STAT: MAINTENANCE */}
        {isWidgetInLayout('stat-maintenance') && (
        <div key="stat-maintenance">
           <WidgetCard 
             title="" 
             className="bg-gradient-to-br from-card to-card/50 border-orange-500/10"
             contentClassName="p-1 overflow-hidden"
             onRemove={isEditable ? () => handleRemoveWidget('stat-maintenance') : undefined}
           >
            <StatWidget 
              title="Maintenance" 
              value={getStatusCount('Maintenance') || getStatusCount('maintenance') || getStatusCount('repair') || getStatusCount('fix')} 
              icon={AlertTriangle} 
              colorClass="text-orange-500"
            />
          </WidgetCard>
        </div>
        )}

        {/* MAIN CHART (Assets by Type) */}
        {isWidgetInLayout('main-chart') && (
        <div key="main-chart">
           <WidgetCard 
             title="Asset Distribution by Type" 
             className="border-border/60"
             onRemove={isEditable ? () => handleRemoveWidget('main-chart') : undefined}
           >
             {chartData.length > 0 ? (
               <div className="h-full w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                   <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                    dy={10}
                    tickFormatter={formatLabel}
                   />
                   <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                   />
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                   <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                   />
                 </BarChart>
               </ResponsiveContainer>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                 <Box className="h-12 w-12 mb-2 opacity-20" />
                 No data available
               </div>
             )}
           </WidgetCard>
        </div>
        )}

        {/* STATUS DISTRIBUTION (DONUT) */}
        {isWidgetInLayout('status-chart') && (
        <div key="status-chart">
           <WidgetCard 
             title="Health Status"
             onRemove={isEditable ? () => handleRemoveWidget('status-chart') : undefined}
           >
             <div className="h-full w-full flex flex-col items-center justify-center relative">
               {statusData.length > 0 ? (
                  <>
                    <div className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={<PieTooltip />} 
                          position={{ x: 0, y: 0 }}
                          wrapperStyle={{ zIndex: 100 }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <span className="text-2xl font-bold">{stats?.total_assets || 0}</span>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                   </div>
                  </>
               ) : (
                 <div className="flex flex-col items-center justify-center text-muted-foreground">
                   <Box className="h-8 w-8 mb-2 opacity-20" />
                   <p className="text-sm">No data available</p>
                 </div>
               )}
             </div>
           </WidgetCard>
        </div>
        )}

        {/* QUICK ACTIONS */}
        {isWidgetInLayout('actions') && (
        <div key="actions">
          <WidgetCard 
            title="Quick Actions"
            onRemove={isEditable ? () => handleRemoveWidget('actions') : undefined}
          >
             <div className="grid gap-3 pt-2">
               <Button 
                 variant="outline" 
                 className="w-full justify-start h-12 hover:border-primary hover:bg-primary/5 group relative overflow-hidden"
                 onClick={() => navigate('/assets?action=new')}
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <Plus className="mr-2 h-5 w-5 text-primary" />
                 <span className="font-medium">New Asset</span>
               </Button>
               <Button 
                 variant="outline" 
                 className="w-full justify-start h-12 hover:border-blue-500 hover:bg-blue-500/5 group relative overflow-hidden"
                 onClick={() => navigate('/assets')}
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <UserPlus className="mr-2 h-5 w-5 text-blue-500" />
                 <span className="font-medium">Assign Asset</span>
               </Button>
               <Button 
                 variant="outline" 
                 className="w-full justify-start h-12 hover:border-orange-500 hover:bg-orange-500/5 group relative overflow-hidden"
                 onClick={() => navigate('/assets')}
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <LogOut className="mr-2 h-5 w-5 text-orange-500" />
                 <span className="font-medium">Return Asset</span>
               </Button>
             </div>
          </WidgetCard>
        </div>
        )}

        {/* RECENT ACTIVITY */}
        {isWidgetInLayout('activity') && (
        <div key="activity">
          <WidgetCard 
            title="Live Activity Feed"
            onRemove={isEditable ? () => handleRemoveWidget('activity') : undefined}
          >
            <div className="space-y-6 pr-2">
              {stats?.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((log, i) => (
                  <div key={log.id} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-2 h-2 rounded-full ring-4 ring-background z-10",
                        i === 0 ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      {i !== stats.recent_activity.length - 1 && (
                        <div className="w-px h-full bg-border -my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors capitalize truncate">
                            <span className="font-bold">{log.user_name}</span> {formatLabel(log.action)} <span className="text-muted-foreground font-normal">{formatLabel(log.entity_type)}</span>
                          </p>
                          {log.origin === 'ai' && (
                            <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-0 flex-shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                AI
                            </Badge>
                          )}
                        </div>
                        <time className="text-xs text-muted-foreground whitespace-nowrap tabular-nums ml-2">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <p className="text-xs text-muted-foreground truncate" title={log.entity_name || log.entity_type}>
                        {log.entity_name ? (
                           <span className="font-medium text-foreground">{log.entity_name}</span>
                        ) : (
                           <span>Affected item ID: {log.entity_id.substring(0,8)}...</span>
                        )}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <span className="ml-2 opacity-70">
                             ({Object.keys(log.changes).join(', ')})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                 <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                   <Activity className="h-8 w-8 mb-2 opacity-20" />
                   <p>No recent activity</p>
                 </div>
              )}
            </div>
          </WidgetCard>
        </div>
        )}

        {/* DYNAMIC USER WIDGETS */}
        {userWidgets.map(widget => {
           // Find the layout item for this widget to pass data-grid fallback
           const layoutItem = layouts.lg?.find((l: any) => l.i === widget.id);
           const dataGrid = layoutItem ? { ...layoutItem } : undefined;

           if (widget.defId === 'stat-maintenance') {
              return (
                <div key={widget.id} data-grid={dataGrid}>
                   <WidgetCard 
                     title="" 
                     className="bg-gradient-to-br from-card to-card/50 border-orange-500/10"
                     contentClassName="p-1 overflow-hidden"
                     onRemove={isEditable ? () => handleRemoveWidget(widget.id) : undefined}
                   >
                    <StatWidget 
                      title="Maintenance" 
                      value={getStatusCount('Maintenance') || getStatusCount('maintenance') || getStatusCount('repair') || getStatusCount('fix')} 
                      icon={AlertTriangle} 
                      colorClass="text-orange-500"
                    />
                  </WidgetCard>
                </div>
              );
           }
           if (widget.defId === 'req-summary') {
              return (
                <div key={widget.id} data-grid={dataGrid}>
                   <WidgetCard 
                     title="Request Summary" 
                     className="bg-gradient-to-br from-card to-card/50 border-purple-500/10"
                     contentClassName="p-1 overflow-hidden"
                     onRemove={isEditable ? () => handleRemoveWidget(widget.id) : undefined}
                   >
                    <StatWidget 
                      title="Pending Requests" 
                      value={(stats?.request_stats?.open || 0) + (stats?.request_stats?.in_progress || 0)} 
                      icon={ListPlus} 
                      colorClass="text-purple-500"
                    />
                  </WidgetCard>
                </div>
              );
           }
           if (widget.defId === 'custom-stat') {
              const statusKey = widget.config?.status || '';
              return (
                <div key={widget.id} data-grid={dataGrid}>
                   <WidgetCard 
                     title="" 
                     className="bg-gradient-to-br from-card to-card/50"
                     contentClassName="p-1 overflow-hidden"
                     onRemove={isEditable ? () => handleRemoveWidget(widget.id) : undefined}
                   >
                    <StatWidget 
                      title={formatLabel(statusKey)}
                      value={getStatusCount(statusKey)} 
                      icon={CheckCircle2} 
                      colorClass="text-foreground"
                    />
                  </WidgetCard>
                </div>
              );
           }
           if (widget.defId === 'loc-chart') {
              return (
                <div key={widget.id} data-grid={dataGrid}>
                   <WidgetCard 
                     title="Assets by Location"
                     onRemove={isEditable ? () => handleRemoveWidget(widget.id) : undefined}
                   >
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={locationData} layout="vertical" margin={{ left: 20 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                          <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20} />
                          <Tooltip />
                       </BarChart>
                     </ResponsiveContainer>
                   </WidgetCard>
                </div>
              );
           }
           if (widget.defId === 'recent-assets') {
              return (
                <div key={widget.id} data-grid={dataGrid}>
                  <WidgetCard 
                    title="Recently Added"
                    onRemove={isEditable ? () => handleRemoveWidget(widget.id) : undefined}
                  >
                    <div className="space-y-4">
                      {stats?.recent_assets?.map(asset => (
                        <div key={asset.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                          <div>
                            <p className="font-medium text-sm truncate max-w-[150px]">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">{asset.type}</p>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {new Date(asset.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </WidgetCard>
                </div>
              );
           }
           return null;
        })}

      </ResponsiveGridLayout>

      <AddWidgetDialog 
        open={showAddWidget} 
        onOpenChange={setShowAddWidget}
        onAdd={handleAddWidget}
        existingWidgets={existingDefIds}
        statusOptions={stats?.status_counts ? Object.keys(stats.status_counts) : []}
      />
    </div>
  );
}
