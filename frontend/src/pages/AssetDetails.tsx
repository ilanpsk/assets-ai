import { getUsers } from '@/api/users';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  ArrowLeft, 
  Edit, 
  Trash2,
  Calendar,
  User,
  MapPin,
  Tag,
  Database,
  Box,
  ArrowUpCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    getAsset, 
    getAssetHistory, 
    updateAsset,
    getCustomFields,
    type Asset,
    type AssetUpdate,
    type CustomFieldDefinition
} from '@/api/assets';
import { AssetHistoryTable } from '@/components/Assets/AssetHistoryTable';
import { EditableCell } from '@/components/ui/editable-cell';
import { PromoteFieldDialog } from '@/components/Assets/PromoteFieldDialog';

// Reusing types from Assets page context roughly, or fetching freshly
import { getAssetTypes, getAssetStatuses, getAssetSets } from '@/api/assets';

export default function AssetDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedLogId = searchParams.get('log_id');
  const queryClient = useQueryClient();
  const [promoteField, setPromoteField] = useState<string | null>(null);

  // Queries
  const { data: asset, isLoading: isAssetLoading, error: assetError } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => id ? getAsset(id) : Promise.reject('No ID'),
    enabled: !!id,
    retry: false, // Don't retry if 404
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['asset-history', id],
    queryFn: () => id ? getAssetHistory(id) : Promise.resolve([]),
    enabled: !!id,
  });

  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: getCustomFields,
  });

  // Lookups for inline editing
  const { data: assetTypes = [] } = useQuery({ queryKey: ['asset-types'], queryFn: getAssetTypes });
  const { data: assetStatuses = [] } = useQuery({ queryKey: ['asset-statuses'], queryFn: getAssetStatuses });
  const { data: assetSets = [] } = useQuery({ queryKey: ['asset-sets'], queryFn: getAssetSets });
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => getUsers() });
  const users = usersData?.items || [];

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssetUpdate }) => 
      updateAsset(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      queryClient.invalidateQueries({ queryKey: ['asset-history', id] });
    },
  });

  const handleUpdate = async (field: keyof AssetUpdate, value: string | number | null) => {
    if (!asset) return;
    
    let payload: AssetUpdate = {};

    if (field === 'status') {
        const statusName = assetStatuses.find(s => s.id === value)?.name;
        if (!statusName) return; 
        payload = { status: statusName };
    } else if (field === 'asset_set_id') {
         payload = { asset_set_id: value === 'unassigned' ? null : (value as string) };
    } else if (field === 'assigned_user_id') {
         payload = { assigned_user_id: value === 'unassigned' ? null : (value as string) };
    } else if (field === 'purchase_price') {
         payload = { purchase_price: Number(value) };
    } else {
        payload = { [field]: value };
    }

    try {
        await updateAssetMutation.mutateAsync({ id: asset.id, payload });
    } catch (error) {
        console.error("Failed to update asset", error);
    }
  };

  // Helper to update custom fields
  const handleCustomFieldUpdate = async (key: string, value: any) => {
      if (!asset) return;
      const currentExtra = asset.extra || {};
      const payload: AssetUpdate = {
          extra: { ...currentExtra, [key]: value }
      };
      try {
        await updateAssetMutation.mutateAsync({ id: asset.id, payload });
      } catch (error) {
        console.error("Failed to update custom field", error);
      }
  };

  if (isAssetLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading asset details...</div>;
  }

  if (assetError || !asset) {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center gap-4">
            <h2 className="text-xl font-semibold">Asset not found</h2>
            <p className="text-muted-foreground">The asset you are looking for does not exist or has been deleted.</p>
            <Button variant="outline" onClick={() => navigate('/assets')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Assets
            </Button>
        </div>
    );
  }

  // Filter applicable custom fields
  const applicableFields = customFields.filter(field => {
    // 1. Global
    if (!field.asset_set_id && !field.asset_type_id) return true;
    // 2. Set-specific
    if (field.asset_set_id && field.asset_set_id === asset.asset_set_id) return true;
    if (field.asset_set_id && asset.asset_set && field.asset_set_id === asset.asset_set.id) return true;
    // 3. Type-specific
    if (field.asset_type_id && field.asset_type_id === asset.asset_type_id) return true;
    if (field.asset_type_id && asset.asset_type && field.asset_type_id === asset.asset_type.id) return true;
    return false;
  }).sort((a, b) => a.order - b.order);

  // Separate known vs unknown extra fields for display
  const unknownExtraKeys = asset.extra ? Object.keys(asset.extra).filter(k => !applicableFields.find(f => f.key === k)) : [];

  // Format value helper
  const formatValue = (value: any, field?: CustomFieldDefinition) => {
    if (value === null || value === undefined) return '-';
    if (field?.field_type === 'boolean') return value ? 'Yes' : 'No';
    if (field?.field_type === 'date') return new Date(value).toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-50/30 dark:bg-zinc-900/10">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{asset.name}</h1>
                <Badge variant={asset.status?.name === 'Active' ? 'default' : 'secondary'}>
                    {asset.status?.name || 'Unknown'}
                </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {asset.serial_number || 'No Serial'}
                </span>
                <span className="flex items-center gap-1">
                    <Box className="h-3 w-3" />
                    {asset.asset_type?.name || 'No Type'}
                </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Asset Information */}
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5" />
                        Asset Information
                    </CardTitle>
                    </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
                            <EditableCell 
                                value={asset.name} 
                                onSave={(val) => handleUpdate('name', val)}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
                            <EditableCell 
                                value={asset.status?.id || asset.status_id || ''}
                                type="select"
                                options={assetStatuses.map(s => ({ label: s.name, value: s.id }))}
                                onSave={(val) => handleUpdate('status', val)}
                                renderDisplay={() => (
                                    <Badge variant={asset.status?.name === 'Active' ? 'default' : 'secondary'}>
                                        {asset.status?.name || 'Unknown'}
                                    </Badge>
                                )}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset Type</label>
                            <EditableCell 
                                value={asset.asset_type?.id || asset.asset_type_id || ''}
                                type="select"
                                options={assetTypes.map(t => ({ label: t.name, value: t.id }))}
                                onSave={(val) => handleUpdate('asset_type_id', val)}
                                renderDisplay={() => asset.asset_type?.name || 'No Type'}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serial Number</label>
                            <EditableCell 
                                value={asset.serial_number || ''} 
                                onSave={(val) => handleUpdate('serial_number', val)}
                                renderDisplay={() => asset.serial_number || <span className="text-muted-foreground opacity-50">No Serial</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset Set</label>
                            <EditableCell 
                                value={asset.asset_set?.id || asset.asset_set_id || 'unassigned'}
                                type="select"
                                options={[
                                  { label: 'Unassigned', value: 'unassigned' },
                                  ...assetSets.map(s => ({ label: s.name, value: s.id }))
                                ]}
                                onSave={(val) => handleUpdate('asset_set_id', val)}
                                renderDisplay={() => asset.asset_set?.name || <span className="text-muted-foreground opacity-50">Unassigned</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</label>
                            <EditableCell 
                                value={asset.location || ''} 
                                onSave={(val) => handleUpdate('location', val)}
                                renderDisplay={() => asset.location || <span className="text-muted-foreground opacity-50">No Location</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        {/* Financials Section */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <span className="w-1 h-4 bg-primary rounded-full"></span>
                                Financials & Lifecycle
                            </h3>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Purchase Price</label>
                            <EditableCell 
                                value={asset.purchase_price !== undefined ? String(asset.purchase_price) : ''}
                                type="text"
                                onSave={(val) => handleUpdate('purchase_price', val ? Number(val) : 0)} // cast to number/any?
                                renderDisplay={() => asset.purchase_price ? `$${Number(asset.purchase_price).toFixed(2)}` : <span className="text-muted-foreground opacity-50">-</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Purchase Date</label>
                            <EditableCell 
                                value={asset.purchase_date || ''}
                                type="date"
                                onSave={(val) => handleUpdate('purchase_date', val)}
                                renderDisplay={() => asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : <span className="text-muted-foreground opacity-50">-</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor</label>
                            <EditableCell 
                                value={asset.vendor || ''}
                                onSave={(val) => handleUpdate('vendor', val)}
                                renderDisplay={() => asset.vendor || <span className="text-muted-foreground opacity-50">-</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order #</label>
                            <EditableCell 
                                value={asset.order_number || ''}
                                onSave={(val) => handleUpdate('order_number', val)}
                                renderDisplay={() => asset.order_number || <span className="text-muted-foreground opacity-50">-</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Warranty End</label>
                            <EditableCell 
                                value={asset.warranty_end || ''}
                                type="date"
                                onSave={(val) => handleUpdate('warranty_end', val)}
                                renderDisplay={() => asset.warranty_end ? new Date(asset.warranty_end).toLocaleDateString() : <span className="text-muted-foreground opacity-50">-</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned User</label>
                            <EditableCell 
                                value={asset.assigned_user?.id || asset.assigned_user_id || 'unassigned'}
                                type="searchable-select"
                                options={[
                                  { label: 'Unassigned', value: 'unassigned' },
                                  ...users.map(u => ({ label: u.full_name || u.email, value: u.id, description: u.email }))
                                ]}
                                onSave={(val) => handleUpdate('assigned_user_id', val)}
                                renderDisplay={() => asset.assigned_user ? (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{asset.assigned_user.full_name || asset.assigned_user.email}</span>
                                        </div>
                                    </div>
                                ) : <span className="text-muted-foreground opacity-50 flex items-center gap-2"><User className="h-4 w-4" /> Unassigned</span>}
                                className="border rounded-md px-3 py-2 h-auto"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</label>
                            <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50 text-muted-foreground text-sm">
                                {asset.created_at ? new Date(asset.created_at).toLocaleString() : '-'}
                            </div>
                        </div>

                         <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Updated</label>
                            <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50 text-muted-foreground text-sm">
                                {asset.updated_at ? new Date(asset.updated_at).toLocaleString() : '-'}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Custom Fields */}
                        {applicableFields.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            Custom Attributes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {applicableFields.map(field => (
                                    <div key={field.id} className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" title={field.key}>
                                            {field.label}
                                        </label>
                                        {field.field_type === 'boolean' ? (
                                            <div className="flex items-center h-10 px-3 border rounded-md bg-background">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!asset.extra?.[field.key]}
                                                    onChange={(e) => handleCustomFieldUpdate(field.key, e.target.checked)}
                                                    className="h-4 w-4"
                                                />
                                                <span className="ml-2 text-sm">{asset.extra?.[field.key] ? 'Yes' : 'No'}</span>
                                            </div>
                                        ) : (
                                            <EditableCell 
                                                value={String(asset.extra?.[field.key] || '')}
                                                onSave={(val) => handleCustomFieldUpdate(field.key, field.field_type === 'integer' ? Number(val) : val)}
                                                className="border rounded-md px-3 py-2 h-auto"
                                                type={(field.field_type === 'date' ? 'date' : 'text') as any}
                                            />
                                        )}
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
                
                {/* Unknown Extra Data */}
                {unknownExtraKeys.length > 0 && (
                    <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Additional Metadata
                        </CardTitle>
                        <CardDescription>Unstructured data attached to this asset</CardDescription>
                        </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {unknownExtraKeys.map(key => (
                                <div key={key} className="space-y-1 group relative">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{key.replace(/_/g, ' ')}</label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => setPromoteField(key)}
                                            className="h-5 px-2 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                            title="Promote this field to a structured Custom Field"
                                        >
                                            <ArrowUpCircle className="h-3 w-3 mr-1.5" />
                                            Promote
                                        </Button>
                                    </div>
                                    <div className="p-2 bg-muted/50 rounded-md text-sm font-mono break-all h-10 flex items-center">
                                        {formatValue(asset.extra?.[key])}
                                    </div>
                                </div>
                             ))}
                        </div>
                        </CardContent>
                    </Card>
                )}

            {/* History */}
            <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                            Audit Log
                        </CardTitle>
                        <CardDescription>
                            Full history of changes and events for this asset.
                        </CardDescription>
                    </CardHeader>
                <CardContent className="min-h-[400px]">
                        {isHistoryLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
                        ) : (
                            <AssetHistoryTable logs={history || []} highlightedLogId={highlightedLogId} />
                        )}
                    </CardContent>
                </Card>
        </div>
      </div>
      {promoteField && asset && (
        <PromoteFieldDialog 
            open={!!promoteField} 
            onOpenChange={(open) => !open && setPromoteField(null)}
            fieldKey={promoteField}
            initialValue={asset.extra?.[promoteField]}
            currentAssetSetId={asset.asset_set_id}
            currentAssetSetName={asset.asset_set?.name}
        />
      )}
    </div>
  );
}
