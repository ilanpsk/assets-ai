import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { getAssets } from '@/api/assets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Monitor, ClipboardList, ArrowUpRight } from 'lucide-react';
import { getRequests } from '@/api/requests';

export function UserDashboard() {
  const { user } = useAuthStore();
  
  const { data: assetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['my-assets'],
    queryFn: () => getAssets({ assigned_user_id: user?.id, size: 100 }),
    enabled: !!user?.id
  });

  const { data: requestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => getRequests(),
  });

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-semibold tracking-tight">{user.full_name}</h1>
        </div>
        <Link to="/requests">
          <Button size="sm" className="gap-1.5">
            New Request
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Assets</p>
                <p className="text-2xl font-semibold mt-1">{assetsData?.total || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Requests</p>
                <p className="text-2xl font-semibold mt-1">
                  {requestsData?.items?.filter(r => r.status !== 'closed').length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="" alt={user.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {user.full_name?.charAt(0) || user.email.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              <div className="flex gap-1.5">
                {user.roles.map(r => (
                  <Badge key={r} variant="secondary" className="capitalize text-xs">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 md:grid-cols-2">
        <Link to="/requests">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Submit Request</p>
                <p className="text-sm text-muted-foreground">Request new equipment or support</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/assets">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium">Browse Assets</p>
                <p className="text-sm text-muted-foreground">View available equipment</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assigned Equipment</CardTitle>
          <CardDescription>Assets currently assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Serial</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAssets ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (!assetsData?.items || assetsData.items.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    No assets assigned
                  </TableCell>
                </TableRow>
              ) : (
                assetsData.items.map((asset: any) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium text-sm">{asset.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                      {asset.serial_number || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{asset.asset_type?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {asset.status?.name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{asset.location || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
