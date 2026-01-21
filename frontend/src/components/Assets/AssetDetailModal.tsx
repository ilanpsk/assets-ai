import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Edit, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAssetHistory, getCustomFields, type Asset, type CustomFieldDefinition } from '@/api/assets';
import { AssetHistoryTable } from './AssetHistoryTable';
import { PromoteFieldDialog } from './PromoteFieldDialog';
import { useState } from 'react';

interface AssetDetailModalProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (asset: Asset) => void;
}

export function AssetDetailModal({ asset, open, onOpenChange, onEdit }: AssetDetailModalProps) {
  const navigate = useNavigate();
  const [promoteField, setPromoteField] = useState<string | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ['asset-history', asset?.id],
    queryFn: () => asset ? getAssetHistory(asset.id) : Promise.resolve([]),
    enabled: !!asset && open,
  });

  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: getCustomFields,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  if (!asset) return null;

  // Filter applicable custom fields
  const applicableFields = customFields.filter(field => {
    // 1. Global fields (no set/type restrictions)
    if (!field.asset_set_id && !field.asset_type_id) return true;
    
    // 2. Set-specific fields
    if (field.asset_set_id && field.asset_set_id === asset.asset_set_id) return true;
    if (field.asset_set_id && asset.asset_set && field.asset_set_id === asset.asset_set.id) return true;

    // 3. Type-specific fields
    if (field.asset_type_id && field.asset_type_id === asset.asset_type_id) return true;
    if (field.asset_type_id && asset.asset_type && field.asset_type_id === asset.asset_type.id) return true;

    return false;
  }).sort((a, b) => a.order - b.order); // Sort by order if needed, or default DB order

  // Helper to format value
  const formatValue = (value: any, field?: CustomFieldDefinition) => {
    if (value === null || value === undefined) return '-';
    if (field?.field_type === 'boolean') return value ? 'Yes' : 'No';
    if (field?.field_type === 'date') return new Date(value).toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Separate known vs unknown extra fields
  const knownExtraFields = applicableFields.filter(f => asset.extra && asset.extra[f.key] !== undefined);
  const unknownExtraKeys = asset.extra ? Object.keys(asset.extra).filter(k => !applicableFields.find(f => f.key === k)) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mr-4">
            <DialogTitle className="text-xl flex items-center gap-2">
              {asset.name}
              {asset.status && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {asset.status.name}
                </Badge>
              )}
            </DialogTitle>
          </div>
          <DialogDescription>
            Serial: {asset.serial_number || 'N/A'} • Type: {asset.asset_type?.name || 'Unknown'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="flex-1 overflow-auto p-1 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Asset Set</span>
                  <p className="font-medium">{asset.asset_set?.name || 'Unassigned'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Location</span>
                  <p className="font-medium">{asset.location || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Assigned User</span>
                  <p className="font-medium">{asset.assigned_user?.full_name || asset.assigned_user?.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Created At</span>
                  <p className="font-medium">{asset.created_at ? new Date(asset.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              
              <Separator />

              {/* Custom Fields Section */}
              <div>
                <h4 className="font-medium mb-3 text-sm">Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                   {/* Render known fields with definitions */}
                   {knownExtraFields.map(field => (
                     <div key={field.id} className="space-y-1">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">{field.label}</span>
                        <p className="font-medium">{formatValue(asset.extra?.[field.key], field)}</p>
                     </div>
                   ))}

                   {/* Render unknown/ad-hoc fields */}
                   {unknownExtraKeys.map(key => (
                      <div key={key} className="space-y-1 group relative">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                            <button 
                                onClick={() => setPromoteField(key)}
                                className="opacity-0 group-hover:opacity-100 text-primary hover:text-primary/80 transition-opacity"
                                title="Promote to Custom Field"
                            >
                                <ArrowUpCircle className="h-3 w-3" />
                            </button>
                        </div>
                        <p className="font-medium">{formatValue(asset.extra?.[key])}</p>
                      </div>
                   ))}

                   {knownExtraFields.length === 0 && unknownExtraKeys.length === 0 && (
                     <p className="text-muted-foreground italic text-xs col-span-2">No additional details available.</p>
                   )}
                </div>
              </div>

            </TabsContent>
            
            <TabsContent value="history" className="flex-1 overflow-auto min-h-0">
              <div className="mt-4">
                <AssetHistoryTable logs={history.slice(0, 5)} compact />
                {history.length > 5 && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                        Showing last 5 events. View full details for more.
                    </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
            <Button variant="outline" size="sm" onClick={() => onEdit(asset)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Asset
            </Button>
            <Button size="sm" onClick={() => navigate(`/assets/${asset.id}`)}>
                View Full Details
                <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </DialogContent>
      {promoteField && (
        <PromoteFieldDialog 
            open={!!promoteField} 
            onOpenChange={(open) => !open && setPromoteField(null)}
            fieldKey={promoteField}
            initialValue={asset.extra?.[promoteField]}
            currentAssetSetId={asset.asset_set_id}
            currentAssetSetName={asset.asset_set?.name}
        />
      )}
    </Dialog>
  );
}
