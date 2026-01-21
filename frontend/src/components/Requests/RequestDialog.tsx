import { useEffect, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createRequest, updateRequest, type Request, type RequestStatus, type RequestType } from '@/api/requests';
import { getAssets } from '@/api/assets';

interface RequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: Request | null;
}

export function RequestDialog({ open, onOpenChange, request }: RequestDialogProps) {
  const { hasPermission, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RequestStatus>('open');
  const [requestType, setRequestType] = useState<RequestType>('other');
  const [assetId, setAssetId] = useState<string>('');

  const targetUserId = request?.requester_id || user?.id;

  const { data: assetsData } = useQuery({
    queryKey: ['assets', targetUserId],
    queryFn: () => getAssets({ assigned_user_id: targetUserId, size: 100 }),
    enabled: !!targetUserId,
  });
  
  const assets = assetsData?.items || [];

  useEffect(() => {
    if (request) {
      setTitle(request.title);
      setDescription(request.description || '');
      setStatus(request.status);
      setRequestType(request.request_type || 'other');
      setAssetId(request.asset_id || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('open');
      setRequestType('other');
      setAssetId('');
    }
  }, [request, open]);

  const createMutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request created successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Failed to create request: ' + (error.response?.data?.detail || error.message));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => updateRequest(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Request updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update request: ' + (error.response?.data?.detail || error.message));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    if (request) {
      updateMutation.mutate({
        id: request.id,
        payload: { title, description, status, request_type: requestType, asset_id: assetId || undefined },
      });
    } else {
      createMutation.mutate({
        title,
        description,
        status, // Technically optional for create, defaults to open on backend usually
        request_type: requestType,
        asset_id: assetId || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canEdit = !request || hasPermission('request:update');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{request ? (canEdit ? 'Edit Request' : 'View Request') : 'New Request'}</DialogTitle>
          <DialogDescription>
            {request
              ? (canEdit ? 'Update the details of the request.' : 'Details of the request.')
              : 'Submit a new request for IT support or resources.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="requestType">Request Type</Label>
            <Select
              value={requestType}
              onValueChange={(value: RequestType) => setRequestType(value)}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="other">General Request</SelectItem>
                <SelectItem value="new_asset">New Asset Request</SelectItem>
                <SelectItem value="assigned_asset">Issue with Assigned Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestType === 'assigned_asset' && (
            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Select
                value={assetId}
                onValueChange={setAssetId}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.serial_number || 'No Serial'})
                    </SelectItem>
                  ))}
                  {assets.length === 0 && (
                    <SelectItem value="_none" disabled>No assigned assets found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. New Monitor Required"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              readOnly={!canEdit}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you need..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              readOnly={!canEdit}
            />
          </div>

          {request && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: RequestStatus) => setStatus(value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {canEdit ? 'Cancel' : 'Close'}
            </Button>
            {canEdit && (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : request ? 'Save Changes' : 'Submit Request'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

