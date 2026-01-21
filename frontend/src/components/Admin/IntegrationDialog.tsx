import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

import { createIntegration, updateIntegration, type Integration, type IntegrationCreate, type IntegrationUpdate } from '@/api/integrations';

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: Integration | null;
}

export function IntegrationDialog({ open, onOpenChange, integration }: IntegrationDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<IntegrationCreate>({
    type: 'google',
    name: '',
    enabled: true,
    config: {},
  });
  const [configJson, setConfigJson] = useState('{}');

  useEffect(() => {
    if (integration) {
      setFormData({
        type: integration.type,
        name: integration.name,
        enabled: integration.enabled,
        config: integration.config,
      });
      setConfigJson(JSON.stringify(integration.config, null, 2));
    } else {
      setFormData({
        type: 'google',
        name: '',
        enabled: true,
        config: {},
      });
      setConfigJson('{}');
    }
  }, [integration, open]);

  const createMutation = useMutation({
    mutationFn: createIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: IntegrationUpdate) => updateIntegration(integration!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(configJson);
    } catch (e) {
      alert("Invalid JSON config");
      return;
    }

    if (integration) {
      updateMutation.mutate({
        name: formData.name,
        enabled: formData.enabled,
        config: parsedConfig,
      });
    } else {
      createMutation.mutate({
        type: formData.type,
        name: formData.name,
        enabled: formData.enabled,
        config: parsedConfig,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{integration ? 'Edit Integration' : 'Add Integration'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Integration"
              required
            />
          </div>
          
          {!integration && (
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                    value={formData.type} 
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="google">Google Workspace</SelectItem>
                        <SelectItem value="ldap">LDAP / Active Directory</SelectItem>
                        <SelectItem value="scim">SCIM 2.0</SelectItem>
                        <SelectItem value="jamf">Jamf Pro</SelectItem>
                        <SelectItem value="intune">Microsoft Intune</SelectItem>
                    </SelectContent>
                </Select>
              </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
                id="enabled" 
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: !!checked })}
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="config">Configuration (JSON)</Label>
            <Textarea
              id="config"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="font-mono text-xs"
              rows={8}
            />
             <p className="text-xs text-muted-foreground">
                Enter keys/secrets/urls here. 
                For Google: client_id, client_secret.
                For LDAP: server_url, bind_dn, bind_password.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {integration ? 'Save Changes' : 'Create Integration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}







