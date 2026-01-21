import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Folder, 
  LayoutGrid, 
  FolderOpen, 
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { 
  getAssets, 
  getAssetSets, 
  createAsset, 
  updateAsset, 
  deleteAsset,
  bulkDeleteAssets,
  createAssetSet, 
  getAssetTypes, 
  getAssetStatuses, 
  getCustomFields, 
  type Asset, 
  type AssetCreate, 
  type AssetUpdate, 
  type AssetSetCreate, 
} from '@/api/assets';
import { getUsers } from '@/api/users';

import { EditableCell } from '@/components/ui/editable-cell';
import { SearchableSelect } from '@/components/ui/searchable-select';

type ViewMode = 'all' | 'unassigned' | string; // string is asset_set_id

import { AssetDetailModal } from '@/components/Assets/AssetDetailModal';

export default function Assets() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSetId = searchParams.get('asset_set_id') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [selectedSetId, setSelectedSetId] = useState<ViewMode>(initialSetId);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');
  
  // Selection State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  // Handle action param
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
        setIsAssetDialogOpen(true);
        // Clean up URL
        searchParams.delete('action');
        setSearchParams(searchParams);
    }
  }, [searchParams]);

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

  // Track selected set/type in the dialog for dynamic fields
  const [formSetId, setFormSetId] = useState<string | undefined>(undefined);
  const [formTypeId, setFormTypeId] = useState<string | undefined>(undefined);
  const [formUserId, setFormUserId] = useState<string | undefined>(undefined);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set([
    'name', 'serial_number', 'asset_type', 'asset_set', 'assigned_user', 'status', 'location', 'actions'
  ]));

  // Sync URL when filter changes
  useEffect(() => {
    // Asset Set
    if (selectedSetId === 'all') {
      searchParams.delete('asset_set_id');
    } else {
      searchParams.set('asset_set_id', selectedSetId);
    }

    // Search
    if (debouncedSearch) {
        searchParams.set('search', debouncedSearch);
    } else {
        searchParams.delete('search');
    }

    setSearchParams(searchParams);
  }, [selectedSetId, debouncedSearch]);

  // Sync state from URL (for external navigation like Header search)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    // Only update if significantly different to avoid fighting with the debounce
    if (urlSearch !== debouncedSearch && urlSearch !== searchQuery) {
        setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page and selection when filters change
  useEffect(() => {
    setPage(1);
    setSelectedAssetIds(new Set()); // Clear selection on filter change
  }, [selectedSetId, selectedStatusId, selectedTypeId, debouncedSearch]);

  // Queries
  const { data: assetSets = [] } = useQuery({
    queryKey: ['asset-sets'],
    queryFn: getAssetSets,
  });

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets', page, pageSize, sortBy, sortOrder, debouncedSearch, selectedSetId, selectedStatusId, selectedTypeId],
    queryFn: () => getAssets({
      page,
      size: pageSize,
      sort_by: sortBy,
      sort_order: sortOrder,
      search: debouncedSearch || undefined,
      asset_set_id: (selectedSetId !== 'all' && selectedSetId !== 'unassigned') ? selectedSetId : undefined,
      unassigned_set: selectedSetId === 'unassigned',
      status_id: selectedStatusId !== 'all' ? selectedStatusId : undefined,
      asset_type_id: selectedTypeId !== 'all' ? selectedTypeId : undefined,
    }),
    placeholderData: (previousData) => previousData
  });

  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: getAssetTypes,
  });

  const { data: assetStatuses = [] } = useQuery({
    queryKey: ['asset-statuses'],
    queryFn: getAssetStatuses,
  });

  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: getCustomFields,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const users = usersData?.items || [];

  // Filter available custom columns based on current context (selected set/type)
  const availableCustomColumns = customFields.filter((field: any) => {
    // 1. Global fields (always available)
    if (!field.asset_set_id && !field.asset_type_id) return true;
    
    // 2. Set specific fields
    // If viewing specific set, only show fields for that set
    if (selectedSetId !== 'all' && selectedSetId !== 'unassigned') {
        if (field.asset_set_id && field.asset_set_id === selectedSetId) return true;
    } 
    // If viewing all, show all set fields? Or maybe just global? 
    // Let's show all available fields that COULD be relevant.
    // Actually, if we are in 'All Assets', showing set-specific columns might be noisy but valid if the user wants to see them.
    // Let's allow them to be toggled.
    if (field.asset_set_id) return true;

    // 3. Type specific fields
    if (selectedTypeId !== 'all') {
        if (field.asset_type_id && field.asset_type_id === selectedTypeId) return true;
    }
    if (field.asset_type_id) return true;

    return false;
  });

  // Helper to handle custom field updates
  const handleCustomFieldUpdate = async (asset: Asset, fieldKey: string, value: any) => {
    const currentExtra = asset.extra || {};
    const payload: AssetUpdate = {
        extra: { ...currentExtra, [fieldKey]: value }
    };
    try {
        await updateAsset(asset.id, payload);
        queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch (error) {
        console.error("Failed to update custom field", error);
    }
  };

  // Mutations
  const createAssetMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsAssetDialogOpen(false);
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssetUpdate }) => 
      updateAsset(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setIsAssetDialogOpen(false);
      setEditingAsset(null);
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: (_data, deletedAssetId) => {
        queryClient.invalidateQueries({ queryKey: ['assets'] });
        toast.success("Asset deleted successfully");
        // Remove from selection if present
        if (selectedAssetIds.has(deletedAssetId)) {
            const next = new Set(selectedAssetIds);
            next.delete(deletedAssetId);
            setSelectedAssetIds(next);
        }
    },
    onError: () => {
        toast.error("Failed to delete asset");
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteAssets,
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['assets'] });
        toast.success(`Successfully deleted ${data.deleted_count} assets`);
        setSelectedAssetIds(new Set());
        setIsBulkDeleteDialogOpen(false);
    },
    onError: () => {
        toast.error("Failed to delete assets");
    }
  });

  const createSetMutation = useMutation({
    mutationFn: createAssetSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-sets'] });
      setIsSetDialogOpen(false);
    },
  });

  const currentSetName = 
    selectedSetId === 'all' ? 'All Assets' :
    selectedSetId === 'unassigned' ? 'Unassigned' :
    assetSets.find((s: any) => s.id === selectedSetId)?.name || 'Unknown Set';

  // Reset form state when dialog opens/closes
  useEffect(() => {
    if (isAssetDialogOpen) {
      if (editingAsset) {
        setFormSetId(editingAsset.asset_set_id || editingAsset.asset_set?.id);
        setFormTypeId(editingAsset.asset_type_id || editingAsset.asset_type?.id);
        setFormUserId(editingAsset.assigned_user_id || editingAsset.assigned_user?.id);
      } else {
        // Defaults
        const defaultSetId = (selectedSetId !== 'all' && selectedSetId !== 'unassigned') 
          ? selectedSetId 
          : assetSets.find((s: any) => s.name === 'General')?.id;
        setFormSetId(defaultSetId);
        setFormTypeId(undefined);
        setFormUserId(undefined);
      }
    }
  }, [isAssetDialogOpen, editingAsset, selectedSetId, assetSets]);

  // Filter custom fields based on form selection
  const visibleCustomFields = customFields.filter((field: any) => {
    // 1. Global
    if (!field.asset_set_id && !field.asset_type_id) return true;
    // 2. Set Specific
    if (field.asset_set_id && field.asset_set_id === formSetId) return true;
    // 3. Type Specific
    if (field.asset_type_id && field.asset_type_id === formTypeId) return true;
    return false;
  });

  // Form Handlers
  const handleCreateOrUpdateAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Extract Custom Fields
    const extra: Record<string, any> = editingAsset?.extra ? { ...editingAsset.extra } : {};
    
    visibleCustomFields.forEach(field => {
      const val = formData.get(`extra_${field.key}`);
      if (val !== null && val !== '') {
        if (field.field_type === 'boolean') {
           extra[field.key] = val === 'on';
        } else {
           extra[field.key] = val;
        }
      } else if (field.field_type === 'boolean') {
         // Checkbox not present means false usually
         extra[field.key] = false;
      }
    });

    if (editingAsset) {
        const statusId = formData.get('status_id') as string;
        const statusName = assetStatuses.find(s => s.id === statusId)?.name;

        // Financials
        const purchase_price = formData.get('purchase_price') ? Number(formData.get('purchase_price')) : undefined;
        const purchase_date = formData.get('purchase_date') ? String(formData.get('purchase_date')) : undefined;
        const vendor = formData.get('vendor') ? String(formData.get('vendor')) : undefined;
        const order_number = formData.get('order_number') ? String(formData.get('order_number')) : undefined;
        const warranty_end = formData.get('warranty_end') ? String(formData.get('warranty_end')) : undefined;

        const payload: AssetUpdate = {
          name: formData.get('name') as string,
          serial_number: formData.get('serial_number') as string,
          location: formData.get('location') as string,
          asset_type_id: formData.get('asset_type_id') as string || undefined,
          status: statusName, // Backend expects status name for update
          asset_set_id: (formData.get('asset_set_id') as string) || undefined,
          assigned_user_id: formUserId || null,
          purchase_price,
          purchase_date,
          vendor,
          order_number,
          warranty_end,
          extra: extra
        };
        updateAssetMutation.mutate({ id: editingAsset.id, payload });
    } else {
        // Financials
        const purchase_price = formData.get('purchase_price') ? Number(formData.get('purchase_price')) : undefined;
        const purchase_date = formData.get('purchase_date') ? String(formData.get('purchase_date')) : undefined;
        const vendor = formData.get('vendor') ? String(formData.get('vendor')) : undefined;
        const order_number = formData.get('order_number') ? String(formData.get('order_number')) : undefined;
        const warranty_end = formData.get('warranty_end') ? String(formData.get('warranty_end')) : undefined;

        const payload: AssetCreate = {
          name: formData.get('name') as string,
          serial_number: formData.get('serial_number') as string,
          location: formData.get('location') as string,
          asset_type_id: formData.get('asset_type_id') as string || undefined,
          status_id: formData.get('status_id') as string || undefined,
          asset_set_id: (formData.get('asset_set_id') as string) || undefined,
          assigned_user_id: formUserId || undefined,
          purchase_price,
          purchase_date,
          vendor,
          order_number,
          warranty_end,
          extra: extra
        };
        createAssetMutation.mutate(payload);
    }
  };

  const handleCreateSet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload: AssetSetCreate = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    };

    createSetMutation.mutate(payload);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleInlineUpdate = async (asset: Asset, field: keyof AssetUpdate, value: string) => {
    let payload: AssetUpdate = {};

    if (field === 'status') {
        // value is ID from select, backend needs name
        const statusName = assetStatuses.find(s => s.id === value)?.name;
        if (!statusName) return; 
        payload = { status: statusName };
    } else if (field === 'asset_set_id') {
         payload = { asset_set_id: value === 'unassigned' ? null : value };
    } else if (field === 'assigned_user_id') {
         payload = { assigned_user_id: value === 'unassigned' ? null : value };
    } else {
        payload = { [field]: value };
    }

    try {
        await updateAsset(asset.id, payload);
        queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch (error) {
        console.error("Failed to update asset", error);
        toast.error("Failed to update asset");
    }
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAssetDialogOpen(true);
    setIsDetailModalOpen(false);
  };

  const openDetailModal = (asset: Asset) => {
    // Only open if not clicking on editable cell or action menu
    // We can rely on event propagation stop in those components, 
    // or just assume if we got here, it's a row click.
    setViewingAsset(asset);
    setIsDetailModalOpen(true);
  };

  const openCreateDialog = () => {
    setEditingAsset(null);
    setIsAssetDialogOpen(true);
  }

  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  };

  // Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        // Select all items on current page
        const newSelected = new Set(selectedAssetIds);
        assetsData?.items.forEach(asset => newSelected.add(asset.id));
        setSelectedAssetIds(newSelected);
    } else {
        // Deselect items on current page
        const newSelected = new Set(selectedAssetIds);
        assetsData?.items.forEach(asset => newSelected.delete(asset.id));
        setSelectedAssetIds(newSelected);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedAssetIds);
    if (checked) {
        newSelected.add(id);
    } else {
        newSelected.delete(id);
    }
    setSelectedAssetIds(newSelected);
  };

  const pageItems = assetsData?.items ?? [];
  const areAllPageItemsSelected = pageItems.length > 0 && pageItems.every(asset => selectedAssetIds.has(asset.id));
  const isSelectionIndeterminate = pageItems.some(asset => selectedAssetIds.has(asset.id)) && !areAllPageItemsSelected;

  const SortHeader = ({ column, label }: { column: string, label: string }) => {
    const isSorted = sortBy === column;
    return (
      <TableHead className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50" onClick={() => handleSort(column)}>
        <div className="flex items-center gap-1">
          {label}
          {isSorted ? (
             sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
             <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-xl border bg-background shadow-sm">
      {/* Left Sidebar - Asset Sets */}
      <div className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col">
        <div className="p-4 flex items-center justify-between">
          <span className="font-semibold text-sm text-zinc-500 uppercase tracking-wider">Inventory</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSetDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            <Button
              variant={selectedSetId === 'all' ? "secondary" : "ghost"}
              className="w-full justify-start font-normal"
              onClick={() => setSelectedSetId('all')}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              All Assets
            </Button>
            <Button
              variant={selectedSetId === 'unassigned' ? "secondary" : "ghost"}
              className="w-full justify-start font-normal"
              onClick={() => setSelectedSetId('unassigned')}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Unassigned
            </Button>
            
            <Separator className="my-2" />
            
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Asset Sets
            </div>
            
            {assetSets.map(set => (
              <Button
                key={set.id}
                variant={selectedSetId === set.id ? "secondary" : "ghost"}
                className="w-full justify-start font-normal truncate"
                onClick={() => setSelectedSetId(set.id)}
              >
                <Folder className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{set.name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">{currentSetName}</h1>
            <Badge variant="outline" className="ml-2">
              {assetsData?.total || 0}
            </Badge>
          </div>
          
          {selectedAssetIds.size > 0 ? (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border animate-in fade-in slide-in-from-top-2 duration-200">
                <span className="text-sm font-medium">{selectedAssetIds.size} selected</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelectedAssetIds(new Set())}>
                    Clear
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-7 px-3"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete Selected
                </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {assetTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>

                <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {assetStatuses.map((status: any) => (
                    <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                    ))}
                </SelectContent>
                </Select>

                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="ml-auto">
                    <Columns className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                    checked={visibleColumns.has('name')}
                    onCheckedChange={() => toggleColumn('name')}
                    >
                    Name
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                    checked={visibleColumns.has('serial_number')}
                    onCheckedChange={() => toggleColumn('serial_number')}
                    >
                    Serial Number
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                    checked={visibleColumns.has('asset_type')}
                    onCheckedChange={() => toggleColumn('asset_type')}
                    >
                    Type
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                    checked={visibleColumns.has('asset_set')}
                    onCheckedChange={() => toggleColumn('asset_set')}
                    >
                    Set
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                    checked={visibleColumns.has('assigned_user')}
                    onCheckedChange={() => toggleColumn('assigned_user')}
                    >
                    Assigned User
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                    checked={visibleColumns.has('status')}
                    onCheckedChange={() => toggleColumn('status')}
                    >
                    Status
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                    checked={visibleColumns.has('location')}
                    onCheckedChange={() => toggleColumn('location')}
                    >
                    Location
                    </DropdownMenuCheckboxItem>
                    
                    {availableCustomColumns.length > 0 && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Custom Fields</DropdownMenuLabel>
                            {availableCustomColumns.map((field: any) => (
                                <DropdownMenuCheckboxItem
                                    key={field.id}
                                    checked={visibleColumns.has(field.key)}
                                    onCheckedChange={() => toggleColumn(field.key)}
                                >
                                    {field.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </>
                    )}
                </DropdownMenuContent>
                </DropdownMenu>

                <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search assets..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                </div>
                <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
                </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-zinc-50/30 dark:bg-zinc-900/10">
          <div className="rounded-md border bg-card flex-1 flex flex-col overflow-hidden">
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[40px] px-4">
                        <Checkbox 
                            checked={isSelectionIndeterminate ? "indeterminate" : !!areAllPageItemsSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                        />
                    </TableHead>
                    {visibleColumns.has('name') && <SortHeader column="name" label="Name" />}
                    {visibleColumns.has('serial_number') && <SortHeader column="serial_number" label="Serial Number" />}
                    {visibleColumns.has('asset_type') && <TableHead>Type</TableHead>}
                    {visibleColumns.has('asset_set') && <TableHead>Set</TableHead>}
                    {visibleColumns.has('assigned_user') && <TableHead>Assigned User</TableHead>}
                    {visibleColumns.has('status') && <TableHead>Status</TableHead>}
                    {visibleColumns.has('location') && <SortHeader column="location" label="Location" />}
                    
                    {/* Dynamic Custom Column Headers */}
                    {availableCustomColumns.map((field: any) => (
                        visibleColumns.has(field.key) && (
                            <TableHead key={field.id}>{field.label}</TableHead>
                        )
                    ))}

                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                     <TableRow>
                       <TableCell colSpan={visibleColumns.size + 2 + availableCustomColumns.filter((f: any) => visibleColumns.has(f.key)).length} className="h-24 text-center text-muted-foreground">
                         Loading...
                       </TableCell>
                     </TableRow>
                  ) : (!assetsData?.items || assetsData.items.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.size + 2 + availableCustomColumns.filter((f: any) => visibleColumns.has(f.key)).length} className="h-24 text-center text-muted-foreground">
                        No assets found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assetsData.items.map((asset: Asset) => (
                      <TableRow 
                        key={asset.id} 
                        className="group hover:bg-muted/50 h-10 cursor-pointer"
                        data-state={selectedAssetIds.has(asset.id) && "selected"}
                        onClick={() => openDetailModal(asset)}
                      >
                        <TableCell className="w-[40px] px-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                                checked={selectedAssetIds.has(asset.id)}
                                onCheckedChange={(checked) => handleSelectRow(asset.id, checked as boolean)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Select row"
                            />
                        </TableCell>
                        {visibleColumns.has('name') && (
                          <TableCell className="font-medium py-1" onClick={(e) => e.stopPropagation()}>
                              <EditableCell 
                                  value={asset.name} 
                                  onSave={(val) => handleInlineUpdate(asset, 'name', val)}
                              />
                          </TableCell>
                        )}
                        {visibleColumns.has('serial_number') && (
                          <TableCell className="py-1">{asset.serial_number || '-'}</TableCell>
                        )}
                        {visibleColumns.has('asset_type') && (
                          <TableCell className="py-1">
                            {asset.asset_type?.name || (asset.asset_type_id ? 'Type ID: ' + asset.asset_type_id.slice(0,8) : '-')}
                          </TableCell>
                        )}
                        {visibleColumns.has('asset_set') && (
                          <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                              <EditableCell 
                                  value={asset.asset_set?.id || asset.asset_set_id || 'unassigned'}
                                  type="select"
                                  options={[
                                    { label: 'Unassigned', value: 'unassigned' },
                                    ...assetSets.map((s: any) => ({ label: s.name, value: s.id }))
                                  ]}
                                  onSave={(val) => handleInlineUpdate(asset, 'asset_set_id', val)}
                                  renderDisplay={() => asset.asset_set?.name || <span className="text-muted-foreground opacity-50">Unassigned</span>}
                              />
                          </TableCell>
                        )}
                        {visibleColumns.has('assigned_user') && (
                          <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                              <EditableCell 
                                  value={asset.assigned_user?.id || asset.assigned_user_id || 'unassigned'}
                                  type="searchable-select"
                                  options={[
                                    { label: 'Unassigned', value: 'unassigned' },
                                    ...users.map((u: any) => ({ label: u.full_name || u.email, value: u.id, description: u.email }))
                                  ]}
                                  onSave={(val) => handleInlineUpdate(asset, 'assigned_user_id', val)}
                                  renderDisplay={() => asset.assigned_user ? (
                                      <div className="flex flex-col">
                                          <span>{asset.assigned_user.full_name || asset.assigned_user.email}</span>
                                          {asset.assigned_user.full_name && <span className="text-xs text-muted-foreground">{asset.assigned_user.email}</span>}
                                      </div>
                                  ) : <span className="text-muted-foreground opacity-50">Unassigned</span>}
                              />
                          </TableCell>
                        )}
                        {visibleColumns.has('status') && (
                          <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                              <EditableCell 
                                  value={asset.status?.id || asset.status_id || ''}
                                  type="select"
                                  options={assetStatuses.map((s: any) => ({ label: s.name, value: s.id }))}
                                  onSave={(val) => handleInlineUpdate(asset, 'status', val)}
                                  renderDisplay={() => asset.status ? (
                                      <Badge variant="secondary" className="font-normal">
                                          {asset.status.name}
                                      </Badge>
                                  ) : '-'}
                              />
                          </TableCell>
                        )}
                        {visibleColumns.has('location') && (
                          <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                              <EditableCell 
                                  value={asset.location || ''} 
                                  onSave={(val) => handleInlineUpdate(asset, 'location', val)}
                              />
                          </TableCell>
                        )}

                        {/* Dynamic Custom Column Cells */}
                        {availableCustomColumns.map((field: any) => (
                            visibleColumns.has(field.key) && (
                                <TableCell key={field.id} className="py-1" onClick={(e) => e.stopPropagation()}>
                                    {field.field_type === 'boolean' ? (
                                        <div className="flex items-center">
                                            <input 
                                                type="checkbox" 
                                                checked={!!asset.extra?.[field.key]}
                                                onChange={(e) => handleCustomFieldUpdate(asset, field.key, e.target.checked)}
                                                className="h-4 w-4"
                                            />
                                        </div>
                                    ) : (
                                        <EditableCell 
                                            value={String(asset.extra?.[field.key] || '')}
                                            onSave={(val) => handleCustomFieldUpdate(asset, field.key, field.field_type === 'integer' ? Number(val) : val)}
                                            type={field.field_type === 'date' ? 'text' : 'text'}
                                        />
                                    )}
                                </TableCell>
                            )
                        ))}

                        <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => openDetailModal(asset)}
                              title="Quick View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(asset)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
                                        deleteAssetMutation.mutate(asset.id);
                                    }
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            <div className="border-t p-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Page {page} of {assetsData?.pages || 1} ({assetsData?.total || 0} items)</span>
                
                <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs">Rows per page:</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(val) => {
                            setPageSize(Number(val));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={pageSize} />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 30, 50, 100].map(size => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(assetsData?.pages || 1, p + 1))}
                  disabled={!assetsData || page >= assetsData.pages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New/Edit Asset Dialog */}
      <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
            <DialogDescription>
              {editingAsset ? 'Update asset details.' : 'Create a new asset and add it to your inventory.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrUpdateAsset}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input 
                    id="name" 
                    name="name" 
                    className="col-span-3" 
                    required 
                    defaultValue={editingAsset?.name}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="serial_number" className="text-right">Serial</Label>
                <Input 
                    id="serial_number" 
                    name="serial_number" 
                    className="col-span-3" 
                    defaultValue={editingAsset?.serial_number || ''}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <div className="col-span-3">
                  <Select 
                    name="asset_type_id" 
                    defaultValue={editingAsset?.asset_type_id}
                    onValueChange={setFormTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <div className="col-span-3">
                  <Select name="status_id" defaultValue={editingAsset?.status_id || editingAsset?.status?.id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetStatuses.map(status => (
                        <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="set" className="text-right">Set</Label>
                <div className="col-span-3">
                  <Select 
                    name="asset_set_id" 
                    defaultValue={
                      editingAsset 
                      ? (editingAsset.asset_set_id || editingAsset.asset_set?.id) 
                      : (selectedSetId !== 'all' && selectedSetId !== 'unassigned') 
                        ? selectedSetId 
                        : assetSets.find(s => s.name === 'General')?.id
                    }
                    onValueChange={setFormSetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select set (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetSets.map(set => (
                        <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user" className="text-right">User</Label>
                <div className="col-span-3">
                  <SearchableSelect
                    value={formUserId}
                    onValueChange={setFormUserId}
                    options={[
                        { label: 'Unassigned', value: '' },
                        ...users.map(u => ({ label: u.full_name || u.email, value: u.id, description: u.email }))
                    ]}
                    placeholder="Assign to user..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">Location</Label>
                <Input 
                    id="location" 
                    name="location" 
                    className="col-span-3" 
                    defaultValue={editingAsset?.location || ''}
                />
              </div>

              <Separator className="my-2" />
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Financials</div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchase_price" className="text-right">Price</Label>
                <Input 
                    id="purchase_price" 
                    name="purchase_price" 
                    type="number"
                    step="0.01"
                    className="col-span-3" 
                    defaultValue={editingAsset?.purchase_price || ''}
                    placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchase_date" className="text-right">Purchased</Label>
                <Input 
                    id="purchase_date" 
                    name="purchase_date" 
                    type="date"
                    className="col-span-3" 
                    defaultValue={editingAsset?.purchase_date || ''}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vendor" className="text-right">Vendor</Label>
                <Input 
                    id="vendor" 
                    name="vendor" 
                    className="col-span-3" 
                    defaultValue={editingAsset?.vendor || ''}
                    placeholder="e.g. Amazon, CDW"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="order_number" className="text-right">Order #</Label>
                <Input 
                    id="order_number" 
                    name="order_number" 
                    className="col-span-3" 
                    defaultValue={editingAsset?.order_number || ''}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="warranty_end" className="text-right">Warranty End</Label>
                <Input 
                    id="warranty_end" 
                    name="warranty_end" 
                    type="date"
                    className="col-span-3" 
                    defaultValue={editingAsset?.warranty_end || ''}
                />
              </div>

              {/* Dynamic Custom Fields */}
              {visibleCustomFields.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Additional Details</div>
                  
                  {visibleCustomFields.map(field => (
                    <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`extra_${field.key}`} className="text-right truncate" title={field.label}>
                        {field.label}
                      </Label>
                      <div className="col-span-3">
                        {field.field_type === 'boolean' ? (
                           <div className="flex items-center h-10">
                             <Input 
                                type="checkbox" 
                                id={`extra_${field.key}`}
                                name={`extra_${field.key}`} 
                                className="h-4 w-4"
                                defaultChecked={!!editingAsset?.extra?.[field.key]} 
                             />
                           </div>
                        ) : field.field_type === 'date' ? (
                            <Input 
                                type="date" 
                                id={`extra_${field.key}`}
                                name={`extra_${field.key}`} 
                                defaultValue={editingAsset?.extra?.[field.key] || ''}
                            />
                        ) : (
                            <Input 
                                id={`extra_${field.key}`}
                                name={`extra_${field.key}`} 
                                defaultValue={editingAsset?.extra?.[field.key] || ''}
                                type={field.field_type === 'integer' ? 'number' : 'text'}
                            />
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAssetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAssetMutation.isPending || updateAssetMutation.isPending}>
                {(createAssetMutation.isPending || updateAssetMutation.isPending) ? 'Saving...' : (editingAsset ? 'Update Asset' : 'Create Asset')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Set Dialog */}
      <Dialog open={isSetDialogOpen} onOpenChange={setIsSetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Asset Set</DialogTitle>
            <DialogDescription>
              Create a new collection to organize your assets.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSet}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="set-name" className="text-right">Name</Label>
                <Input id="set-name" name="name" className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" name="description" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSetMutation.isPending}>
                {createSetMutation.isPending ? 'Creating...' : 'Create Set'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AssetDetailModal 
        asset={viewingAsset} 
        open={isDetailModalOpen} 
        onOpenChange={setIsDetailModalOpen}
        onEdit={openEditDialog}
      />

      {/* Bulk Delete Alert */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{selectedAssetIds.size}</strong> selected asset{selectedAssetIds.size !== 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault(); // Prevent auto-closing
                bulkDeleteMutation.mutate(Array.from(selectedAssetIds));
              }}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
