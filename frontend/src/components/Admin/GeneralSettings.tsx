import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getSystemSettings, updateSystemSetting } from '@/api/admin';

export function GeneralSettings() {
  const queryClient = useQueryClient();
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: getSystemSettings,
  });

  useEffect(() => {
    if (settings) {
      const map: Record<string, any> = {};
      settings.forEach(s => {
        map[s.key] = s.value;
      });
      setSettingsMap(map);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (vars: { key: string; value: any; is_secure?: boolean }) => {
      return updateSystemSetting(vars.key, { value: vars.value, is_secure: vars.is_secure });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleSave = (key: string, value: any, is_secure = false) => {
    updateMutation.mutate({ key, value, is_secure });
  };

  const handleInputChange = (key: string, value: any) => {
    setSettingsMap(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>
            Configure the AI provider and API keys for the chat assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai_provider">AI Provider</Label>
            <Select
              value={settingsMap['ai_provider'] || 'openai'}
              onValueChange={(val) => handleInputChange('ai_provider', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
            <Button 
                size="sm" 
                onClick={() => handleSave('ai_provider', settingsMap['ai_provider'])}
                disabled={updateMutation.isPending}
            >
                Save Provider
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai_api_key">API Key</Label>
            <div className="flex gap-2">
                <Input
                id="ai_api_key"
                type="password"
                placeholder="sk-..."
                value={settingsMap['ai_api_key'] || ''}
                onChange={(e) => handleInputChange('ai_api_key', e.target.value)}
                />
                <Button 
                    onClick={() => handleSave('ai_api_key', settingsMap['ai_api_key'], true)}
                    disabled={updateMutation.isPending}
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                This key is stored securely and never returned fully in the API.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai_model">Model Name</Label>
            <div className="flex gap-2">
                <Input
                id="ai_model"
                placeholder="e.g. gpt-4-turbo"
                value={settingsMap['ai_model'] || ''}
                onChange={(e) => handleInputChange('ai_model', e.target.value)}
                />
                <Button 
                    onClick={() => handleSave('ai_model', settingsMap['ai_model'])}
                    disabled={updateMutation.isPending}
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>System Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="space-y-2">
            <Label htmlFor="app_name">Application Name</Label>
            <div className="flex gap-2">
                <Input
                id="app_name"
                placeholder="IT Asset Manager"
                value={settingsMap['app_name'] || ''}
                onChange={(e) => handleInputChange('app_name', e.target.value)}
                />
                <Button 
                    onClick={() => handleSave('app_name', settingsMap['app_name'])}
                    disabled={updateMutation.isPending}
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Upload Settings</CardTitle>
            <CardDescription>Configure file upload limits for IT users (Admins have no limit).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="space-y-2">
            <Label htmlFor="import_max_upload_mb">Max Upload Size (MB)</Label>
            <div className="flex gap-2">
                <Input
                id="import_max_upload_mb"
                type="number"
                min="1"
                placeholder="50"
                value={settingsMap['import_max_upload_mb'] || ''}
                onChange={(e) => handleInputChange('import_max_upload_mb', e.target.value)}
                />
                <Button 
                    onClick={() => handleSave('import_max_upload_mb', settingsMap['import_max_upload_mb'])}
                    disabled={updateMutation.isPending}
                >
                    <Save className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">Default: 50 MB if unset.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}







