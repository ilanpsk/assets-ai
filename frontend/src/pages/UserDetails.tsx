import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Mail,
  Shield,
  Clock,
  Database,
  Box
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getUser, getUserHistory } from '@/api/users';
import { getAssets } from '@/api/assets';
import { AssetHistoryTable } from '@/components/Assets/AssetHistoryTable';

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedLogId = searchParams.get('log_id');

  // 1. Fetch User Details
  const { data: user, isLoading: isUserLoading, error: userError } = useQuery({
    queryKey: ['user', id],
    queryFn: () => id ? getUser(id) : Promise.reject('No ID'),
    enabled: !!id,
    retry: false,
  });

  // 2. Fetch Assigned Assets
  const { data: assetsData, isLoading: isAssetsLoading } = useQuery({
    queryKey: ['user-assets', id],
    queryFn: () => id ? getAssets({ assigned_user_id: id, size: 100 }) : Promise.resolve({ items: [], total: 0, page: 1, size: 100, pages: 0 }),
    enabled: !!id,
  });

  // 3. Fetch User History
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['user-history', id],
    queryFn: () => id ? getUserHistory(id) : Promise.resolve([]),
    enabled: !!id,
  });

  if (isUserLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading user details...</div>;
  }

  if (userError || !user) {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center gap-4">
            <h2 className="text-xl font-semibold">User not found</h2>
            <p className="text-muted-foreground">The user you are looking for does not exist.</p>
            <Button variant="outline" onClick={() => navigate('/people')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to People
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-zinc-50/30 dark:bg-zinc-900/10">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/people')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{user.full_name || 'Unnamed User'}</h1>
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                </span>
                {user.roles && user.roles.length > 0 && (
                     <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {user.roles.join(', ')}
                    </span>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            
            {/* Left Column: Assigned Assets */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Box className="h-5 w-5" />
                            Assigned Assets
                        </CardTitle>
                        <CardDescription>
                            Assets currently assigned to this user.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isAssetsLoading ? (
                            <div className="text-center py-4">Loading assets...</div>
                        ) : assetsData?.items.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No assets assigned.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Tag/Serial</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assetsData?.items.map(asset => (
                                        <TableRow 
                                            key={asset.id} 
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => navigate(`/assets/${asset.id}`)}
                                        >
                                            <TableCell className="font-medium">{asset.name}</TableCell>
                                            <TableCell>{asset.serial_number || '-'}</TableCell>
                                            <TableCell>{asset.asset_type?.name || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{asset.status?.name || 'Unknown'}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Audit Log
                        </CardTitle>
                        <CardDescription>
                            History of changes to this user profile.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {isHistoryLoading ? (
                            <div className="text-center py-4">Loading history...</div>
                        ) : (
                            // @ts-ignore - mismatch in audit log types between files but structure is compatible
                            <AssetHistoryTable 
                                logs={history || []} 
                                compact={false} 
                                emptyMessage="No history available for this user."
                                highlightedLogId={highlightedLogId}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Info / Stats */}
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>User Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                            <div className="text-sm font-medium">{user.email}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                            <div className="text-sm font-medium">{user.full_name || '-'}</div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Employment End</label>
                            <div className="text-sm font-medium">
                                {user.employment_end_date ? new Date(user.employment_end_date).toLocaleDateString() : '-'}
                            </div>
                        </div>
                         <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created At</label>
                            <div className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                            </div>
                        </div>
                    </CardContent>
                 </Card>
            </div>

        </div>
      </div>
    </div>
  );
}

