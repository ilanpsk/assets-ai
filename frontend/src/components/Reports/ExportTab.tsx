import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Users, Database } from 'lucide-react';
import { toast } from 'sonner';

import { exportData } from '@/api/reports';
import { getCustomFields } from '@/api/assets';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle, CardHeader, CardFooter } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ExportOption {
  label: string;
  fields: string[];
}

const BASE_EXPORT_OPTIONS: Record<string, ExportOption> = {
  asset: {
    label: 'Assets',
    fields: ['name', 'serial_number', 'asset_type', 'status', 'assigned_user', 'location', 'asset_set', 'source', 'created_at']
  },
  user: {
    label: 'Users',
    fields: ['email', 'full_name', 'is_active', 'created_at']
  },
  log: {
    label: 'Audit Logs',
    fields: ['timestamp', 'action', 'entity_type', 'entity_id', 'user_id', 'changes']
  }
};

export function ExportTab() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [currentExportOptions, setCurrentExportOptions] = useState(BASE_EXPORT_OPTIONS);

  // Fetch custom fields to augment export options
  const { data: customFields } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: getCustomFields
  });

  // Update export options when custom fields load
  useEffect(() => {
    if (customFields) {
      const assetFields = [...BASE_EXPORT_OPTIONS.asset.fields];
      customFields.forEach(cf => {
        if (cf.target === 'asset' && !assetFields.includes(cf.key)) {
          assetFields.push(cf.key);
        }
      });
      
      setCurrentExportOptions({
        ...BASE_EXPORT_OPTIONS,
        asset: {
          ...BASE_EXPORT_OPTIONS.asset,
          fields: assetFields
        }
      });
    }
  }, [customFields]);

  const openExportDialog = (type: string) => {
    setExportType(type);
    setSelectedFields(currentExportOptions[type].fields); // Select all by default
    setExportDialogOpen(true);
  };

  const handleExport = async () => {
    if (!exportType) return;
    
    try {
      toast.info('Starting download...');
      // Note: Filters are not currently passed from this simplified view, 
      // but the API supports them if we want to add them back later.
      await exportData(exportType, selectedFields, {});
      toast.success('Export downloaded');
      setExportDialogOpen(false);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const getFieldLabel = (field: string) => {
    const customField = customFields?.find(cf => cf.key === field);
    if (customField) return customField.label;
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Database className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Export Assets</CardTitle>
            <CardDescription>
              Download a complete list of assets including current status, assignment, and details.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => openExportDialog('asset')}>
              <Download className="mr-2 h-4 w-4" /> Configure Export
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Export Users</CardTitle>
            <CardDescription>
              Get a list of all system users, their roles, and account status.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => openExportDialog('user')}>
              <Download className="mr-2 h-4 w-4" /> Configure Export
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Export Logs</CardTitle>
            <CardDescription>
              Download raw audit logs for compliance and external analysis.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => openExportDialog('log')}>
              <Download className="mr-2 h-4 w-4" /> Configure Export
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export Configuration: {exportType && currentExportOptions[exportType]?.label}</DialogTitle>
            <DialogDescription>
              Select the fields you want to include in the CSV export.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <Label>Fields</Label>
              <div className="grid grid-cols-2 gap-4">
                {exportType && currentExportOptions[exportType]?.fields.map((field) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox 
                      id={field} 
                      checked={selectedFields.includes(field)}
                      onCheckedChange={() => toggleField(field)}
                    />
                    <label
                      htmlFor={field}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {getFieldLabel(field)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={selectedFields.length === 0}>
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

