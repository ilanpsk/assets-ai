import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    createCustomField, 
    getAssetSets, 
    CustomFieldTarget, 
    CustomFieldType 
} from '@/api/assets';
import { toast } from 'sonner';

interface PromoteFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldKey: string;
  initialValue: any;
  currentAssetSetId?: string;
  currentAssetSetName?: string;
}

export function PromoteFieldDialog({ 
    open, 
    onOpenChange, 
    fieldKey, 
    initialValue, 
    currentAssetSetId,
    currentAssetSetName
}: PromoteFieldDialogProps) {
    const queryClient = useQueryClient();
    const [label, setLabel] = useState(fieldKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    const [scope, setScope] = useState<'global' | 'current_set' | 'specific_set'>('global');
    const [specificSetId, setSpecificSetId] = useState<string>('');
    const [fieldType, setFieldType] = useState<CustomFieldType>(() => {
        if (typeof initialValue === 'boolean') return CustomFieldType.boolean;
        if (typeof initialValue === 'number') return CustomFieldType.integer;
        // Check for date-like string?
        return CustomFieldType.string;
    });

    const { data: assetSets = [] } = useQuery({
        queryKey: ['asset-sets'],
        queryFn: getAssetSets,
        enabled: open && scope === 'specific_set',
    });

    const createMutation = useMutation({
        mutationFn: createCustomField,
        onSuccess: () => {
            toast.success('Field promoted successfully');
            queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to promote field');
        }
    });

    const handleSubmit = () => {
        let assetSetId: string | undefined = undefined;
        if (scope === 'current_set') assetSetId = currentAssetSetId;
        if (scope === 'specific_set') assetSetId = specificSetId;

        createMutation.mutate({
            key: fieldKey,
            label,
            field_type: fieldType,
            target: CustomFieldTarget.asset,
            asset_set_id: assetSetId,
            required: false,
            order: 0,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Promote to Custom Field</DialogTitle>
                    <DialogDescription>
                        Turn "{fieldKey}" into a structured custom field.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Label</Label>
                        <Input value={label} onChange={e => setLabel(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Scope</Label>
                        <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">Global (All Assets)</SelectItem>
                                {currentAssetSetId && (
                                    <SelectItem value="current_set">
                                        Current Set ({currentAssetSetName || 'Unnamed'})
                                    </SelectItem>
                                )}
                                <SelectItem value="specific_set">Specific Asset Set</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {scope === 'specific_set' && (
                        <div className="space-y-2">
                            <Label>Asset Set</Label>
                             <Select value={specificSetId} onValueChange={setSpecificSetId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Asset Set" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assetSets.map(set => (
                                        <SelectItem key={set.id} value={set.id}>
                                            {set.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Field Type</Label>
                         <Select value={fieldType} onValueChange={(v: CustomFieldType) => setFieldType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={CustomFieldType.string}>Text</SelectItem>
                                <SelectItem value={CustomFieldType.integer}>Number</SelectItem>
                                <SelectItem value={CustomFieldType.boolean}>Yes/No</SelectItem>
                                <SelectItem value={CustomFieldType.date}>Date</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Promoting...' : 'Promote Field'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}







