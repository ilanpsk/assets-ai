import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Pencil, 
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getRequests, deleteRequest, type Request } from '@/api/requests';
import { RequestDialog } from '@/components/Requests/RequestDialog';

export default function Requests() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  
  // State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: string, to?: string }>({});
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, dateRange]);

  const { data, isLoading } = useQuery({
    queryKey: ['requests', page, pageSize, debouncedSearch, statusFilter, typeFilter, dateRange],
    queryFn: () => getRequests({
      page,
      size: pageSize,
      search: debouncedSearch,
      status: statusFilter === 'all' ? undefined : statusFilter,
      request_type: typeFilter === 'all' ? undefined : typeFilter,
      start_date: dateRange.from,
      end_date: dateRange.to
    }),
  });

  const requests = data?.items || [];
  const total = data?.total || 0;
  const pageCount = Math.ceil(total / pageSize);

  const deleteMutation = useMutation({
    mutationFn: deleteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      setRequestToDelete(null);
    },
  });

  const handleEdit = (request: Request) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleDelete = (request: Request) => {
    setRequestToDelete(request);
  };

  const handleAddNew = () => {
    setSelectedRequest(null);
    setIsDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'secondary';
      case 'in_progress':
        return 'default'; 
      case 'closed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatType = (type?: string) => {
    if (!type) return 'General';
    switch (type) {
        case 'new_asset': return 'New Asset';
        case 'assigned_asset': return 'Assigned Asset';
        case 'other': return 'General';
        default: return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };
  
  const canViewAll = hasPermission('request:view_all');

  return (
    <div className="h-full flex flex-col space-y-4 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
             {canViewAll ? 'Requests' : 'My Requests'}
          </h2>
          <p className="text-muted-foreground">
            {canViewAll ? 'Track and manage IT service requests.' : 'Track your service requests.'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={canViewAll ? "Search requests..." : "Search my requests..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="new_asset">New Asset</SelectItem>
            <SelectItem value="assigned_asset">Assigned Asset</SelectItem>
            <SelectItem value="other">General</SelectItem>
          </SelectContent>
        </Select>

        <Input 
          type="date" 
          className="w-[150px]"
          value={dateRange.from || ''}
          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
        />
        <Input 
          type="date" 
          className="w-[150px]"
          value={dateRange.to || ''}
          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
        />
      </div>

      <div className="rounded-md border flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                {canViewAll && <TableHead>Requester</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canViewAll ? 6 : 5} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canViewAll ? 6 : 5} className="h-24 text-center">
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow 
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(req)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{req.title}</span>
                        {req.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {req.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{formatType(req.request_type)}</span>
                        {req.asset && <span className="text-xs text-muted-foreground">{req.asset.name}</span>}
                      </div>
                    </TableCell>
                    
                    {canViewAll && (
                      <TableCell>
                        {req.requester ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{req.requester.full_name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{req.requester.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(req.status)}>
                        {formatStatus(req.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.created_at ? format(new Date(req.created_at), 'PPP') : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(req)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {hasPermission('request:update') ? 'Edit' : 'View'}
                          </DropdownMenuItem>
                          {hasPermission('request:update') && (
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleDelete(req)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4 border-t p-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
            >
                Previous
            </Button>
            <div className="text-sm text-muted-foreground">
                Page {page} of {Math.max(1, pageCount)}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pageCount || isLoading}
            >
                Next
            </Button>
        </div>
      </div>

      <RequestDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        request={selectedRequest}
      />

      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the request "{requestToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => requestToDelete && deleteMutation.mutate(requestToDelete.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
