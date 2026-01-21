import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Loader2,
  Tag,
  List,
  Database,
  Pencil
} from 'lucide-react';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';

import { 
  getAssetStatuses, 
  createAssetStatus, 
  deleteAssetStatus,
  updateAssetStatus,
  getAssetTypes,
  createAssetType,
  deleteAssetType,
  updateAssetType,
  getAssetSets,
  getCustomFields,
  createCustomField,
  deleteCustomField,
  updateCustomField,
  CustomFieldTarget,
  CustomFieldType,
  type AssetStatus,
  type AssetType,
  type AssetSet,
  type CustomFieldDefinition,
  type CustomFieldDefinitionCreate,
  type CustomFieldDefinitionUpdate
} from '@/api/assets';

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("statuses");
  
  // -- Status State --
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<AssetStatus | null>(null);
  const [newStatusKey, setNewStatusKey] = useState("");
  const [newStatusLabel, setNewStatusLabel] = useState("");

  // -- Type State --
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AssetType | null>(null);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");

  // -- Custom Field State --
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>(CustomFieldType.string);
  const [newFieldScope, setNewFieldScope] = useState<"global" | "set" | "type">("global");
  const [selectedScopeId, setSelectedScopeId] = useState<string>("");

  // -- Queries --
  const { data: statuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['asset-statuses'],
    queryFn: getAssetStatuses,
  });

  const { data: types = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ['asset-types'],
    queryFn: getAssetTypes,
  });

  const { data: sets = [], isLoading: isLoadingSets } = useQuery({
    queryKey: ['asset-sets'],
    queryFn: getAssetSets,
  });

  const { data: customFields = [], isLoading: isLoadingFields } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: getCustomFields,
  });

  // -- Mutations --
  const createStatusMutation = useMutation({
    mutationFn: createAssetStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-statuses'] });
      setIsStatusDialogOpen(false);
      resetStatusForm();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: { label?: string } }) => updateAssetStatus(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-statuses'] });
      setIsStatusDialogOpen(false);
      resetStatusForm();
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: deleteAssetStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-statuses'] });
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: createAssetType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      setIsTypeDialogOpen(false);
      resetTypeForm();
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) => updateAssetType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      setIsTypeDialogOpen(false);
      resetTypeForm();
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: deleteAssetType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: createCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      setIsFieldDialogOpen(false);
      resetFieldForm();
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomFieldDefinitionUpdate }) => updateCustomField(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      setIsFieldDialogOpen(false);
      resetFieldForm();
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: deleteCustomField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
    },
  });

  // -- Reset Functions --
  const resetStatusForm = () => {
    setEditingStatus(null);
    setNewStatusKey("");
    setNewStatusLabel("");
  };

  const resetTypeForm = () => {
    setEditingType(null);
    setNewTypeName("");
    setNewTypeDescription("");
  };

  const resetFieldForm = () => {
    setEditingField(null);
    setNewFieldLabel("");
    setNewFieldKey("");
    setNewFieldType(CustomFieldType.string);
    setNewFieldScope("global");
    setSelectedScopeId("");
  };

  // -- Open Dialog Functions --
  const openStatusDialog = (status?: AssetStatus) => {
    if (status) {
      setEditingStatus(status);
      setNewStatusKey(status.name);
      setNewStatusLabel(status.description || "");
    } else {
      resetStatusForm();
    }
    setIsStatusDialogOpen(true);
  };

  const openTypeDialog = (type?: AssetType) => {
    if (type) {
      setEditingType(type);
      setNewTypeName(type.name);
      setNewTypeDescription(type.description || "");
    } else {
      resetTypeForm();
    }
    setIsTypeDialogOpen(true);
  };

  const openFieldDialog = (field?: CustomFieldDefinition) => {
    if (field) {
      setEditingField(field);
      setNewFieldLabel(field.label);
      setNewFieldKey(field.key);
      setNewFieldType(field.field_type);
      if (field.asset_set_id) {
        setNewFieldScope("set");
        setSelectedScopeId(field.asset_set_id);
      } else if (field.asset_type_id) {
        setNewFieldScope("type");
        setSelectedScopeId(field.asset_type_id);
      } else {
        setNewFieldScope("global");
        setSelectedScopeId("");
      }
    } else {
      resetFieldForm();
    }
    setIsFieldDialogOpen(true);
  };

  // -- Handlers --
  const handleCreateOrUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusKey) return;

    if (editingStatus) {
        // Only update label/description, key is ID
        updateStatusMutation.mutate({ 
            key: editingStatus.name, // original key
            data: { label: newStatusLabel }
        });
    } else {
        createStatusMutation.mutate({ 
            key: newStatusKey, 
            label: newStatusLabel || newStatusKey 
        });
    }
  };

  const handleCreateOrUpdateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName) return;

    if (editingType) {
        updateTypeMutation.mutate({ 
            id: editingType.id, 
            data: { name: newTypeName, description: newTypeDescription }
        });
    } else {
        createTypeMutation.mutate({ 
            name: newTypeName, 
            description: newTypeDescription 
        });
    }
  };

  const handleCreateOrUpdateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel || !newFieldKey) return;

    if (editingField) {
      // For updates, only send fields that can be updated (not key or target)
      const updatePayload: CustomFieldDefinitionUpdate = {
        label: newFieldLabel,
        field_type: newFieldType,
        asset_set_id: newFieldScope === 'set' ? selectedScopeId : null,
        asset_type_id: newFieldScope === 'type' ? selectedScopeId : null,
      };
      updateFieldMutation.mutate({ id: editingField.id, data: updatePayload });
    } else {
      // For creates, include all fields
      const createPayload: CustomFieldDefinitionCreate = {
        label: newFieldLabel,
        key: newFieldKey,
        target: CustomFieldTarget.asset,
        field_type: newFieldType,
        asset_set_id: newFieldScope === 'set' ? selectedScopeId : undefined,
        asset_type_id: newFieldScope === 'type' ? selectedScopeId : undefined,
      };
      createFieldMutation.mutate(createPayload);
    }
  };

  // Auto-generate key from label (only when creating)
  useEffect(() => {
    if (!editingField && newFieldLabel && !newFieldKey) {
        setNewFieldKey(newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    }
  }, [newFieldLabel, newFieldKey, editingField]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage system configurations and defaults.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[600px] grid-cols-3">
          <TabsTrigger value="statuses">
            <List className="mr-2 h-4 w-4" />
            Asset Statuses
          </TabsTrigger>
          <TabsTrigger value="types">
            <Tag className="mr-2 h-4 w-4" />
            Asset Types
          </TabsTrigger>
          <TabsTrigger value="fields">
            <Database className="mr-2 h-4 w-4" />
            Custom Fields
          </TabsTrigger>
        </TabsList>

        {/* Statuses Tab */}
        <TabsContent value="statuses" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Asset Statuses</h2>
              <p className="text-sm text-muted-foreground">
                Define the possible lifecycle states for your assets (e.g., General, Maintenance, Retired).
              </p>
            </div>
            <Button onClick={() => openStatusDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Status
            </Button>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStatuses ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : statuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No statuses defined.
                    </TableCell>
                  </TableRow>
                ) : (
                  statuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="font-medium">
                        {status.name}
                        {status.is_default && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell>{(status as any).description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openStatusDialog(status)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!status.is_default && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteStatusMutation.mutate(status.name)}
                                disabled={deleteStatusMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types" className="space-y-4 pt-4">
           <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Asset Types</h2>
              <p className="text-sm text-muted-foreground">
                 Categorize your assets (e.g., General, Laptop, Monitor).
              </p>
            </div>
            <Button onClick={() => openTypeDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTypes ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : types.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No types defined.
                    </TableCell>
                  </TableRow>
                ) : (
                  types.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description || '-'}</TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openTypeDialog(type)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteTypeMutation.mutate(type.id)}
                                disabled={deleteTypeMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="fields" className="space-y-4 pt-4">
           <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Custom Fields</h2>
              <p className="text-sm text-muted-foreground">
                 Define additional fields for your assets. These can be global or scoped to specific sets/types.
              </p>
            </div>
            <Button onClick={() => openFieldDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingFields ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : customFields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No custom fields defined.
                    </TableCell>
                  </TableRow>
                ) : (
                  customFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{field.key}</TableCell>
                      <TableCell>
                          <Badge variant="outline">{field.field_type}</Badge>
                      </TableCell>
                      <TableCell>
                          {field.asset_set_id ? (
                                <Badge variant="secondary">
                                    Set: {sets.find(s => s.id === field.asset_set_id)?.name || 'Unknown'}
                                </Badge>
                          ) : field.asset_type_id ? (
                                <Badge variant="secondary">
                                    Type: {types.find(t => t.id === field.asset_type_id)?.name || 'Unknown'}
                                </Badge>
                          ) : (
                                <Badge variant="secondary">Global</Badge>
                          )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openFieldDialog(field)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteFieldMutation.mutate(field.id)}
                              disabled={deleteFieldMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'Edit Status' : 'Add Asset Status'}</DialogTitle>
            <DialogDescription>
              {editingStatus ? 'Modify status details.' : 'Create a new status for your assets.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdateStatus}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status-key" className="text-right">Name</Label>
                <Input 
                  id="status-key" 
                  value={newStatusKey}
                  onChange={(e) => setNewStatusKey(e.target.value)}
                  placeholder="e.g. Broken"
                  className="col-span-3"
                  required
                  disabled={!!editingStatus} // Don't allow changing key/name for statuses usually
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status-label" className="text-right">Description</Label>
                <Input 
                  id="status-label" 
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                  placeholder="e.g. Asset needs repair"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStatusMutation.isPending || updateStatusMutation.isPending}>
                {createStatusMutation.isPending || updateStatusMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Type Dialog */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Asset Type' : 'Add Asset Type'}</DialogTitle>
            <DialogDescription>
              {editingType ? 'Modify asset type details.' : 'Create a new category for your assets.'}
            </DialogDescription>
          </DialogHeader>
           <form onSubmit={handleCreateOrUpdateType}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type-name" className="text-right">Name</Label>
                <Input 
                  id="type-name" 
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Tablet"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type-desc" className="text-right">Description</Label>
                <Input 
                  id="type-desc" 
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                  placeholder="e.g. Handheld tablet devices"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTypeMutation.isPending || updateTypeMutation.isPending}>
                {createTypeMutation.isPending || updateTypeMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Custom Field Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>
            <DialogDescription>
              {editingField ? 'Modify existing custom field.' : 'Create a new field for extra asset data.'}
            </DialogDescription>
          </DialogHeader>
           <form onSubmit={handleCreateOrUpdateField}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="field-label" className="text-right">Label</Label>
                <Input 
                  id="field-label" 
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="e.g. Warranty Expiry"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="field-key" className="text-right">Key</Label>
                <Input 
                  id="field-key" 
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  placeholder="e.g. warranty_expiry"
                  className="col-span-3 font-mono"
                  required
                  disabled={!!editingField} // Don't allow key editing for now to avoid data loss issues
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="field-type" className="text-right">Type</Label>
                <div className="col-span-3">
                    <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as CustomFieldType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={CustomFieldType.string}>Text</SelectItem>
                            <SelectItem value={CustomFieldType.integer}>Number</SelectItem>
                            <SelectItem value={CustomFieldType.boolean}>Checkbox</SelectItem>
                            <SelectItem value={CustomFieldType.date}>Date</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="field-scope" className="text-right">Scope</Label>
                <div className="col-span-3">
                     <Select value={newFieldScope} onValueChange={(v: any) => setNewFieldScope(v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Global" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="global">Global (All Assets)</SelectItem>
                            <SelectItem value="set">Specific Asset Set</SelectItem>
                            <SelectItem value="type">Specific Asset Type</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>

              {newFieldScope === 'set' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="scope-set" className="text-right">Asset Set</Label>
                    <div className="col-span-3">
                        <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Set" />
                            </SelectTrigger>
                            <SelectContent>
                                {sets.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
              )}

              {newFieldScope === 'type' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="scope-type" className="text-right">Asset Type</Label>
                    <div className="col-span-3">
                        <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {types.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
              )}

            </div>
            <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setIsFieldDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFieldMutation.isPending || updateFieldMutation.isPending}>
                {createFieldMutation.isPending || updateFieldMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
