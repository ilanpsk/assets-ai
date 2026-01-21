import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from '@/components/Admin/GeneralSettings';
import { AccessControl } from '@/components/Admin/AccessControl';
import { Integrations } from '@/components/Admin/Integrations';
import RoleManager from '@/components/Admin/RoleManager';
import { Snapshots } from '@/components/Admin/Snapshots';

export default function Admin() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="h-full flex flex-col space-y-4 p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          System settings, integrations, and access control.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Integrations />
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <AccessControl />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RoleManager />
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-4">
          <Snapshots />
        </TabsContent>
      </Tabs>
    </div>
  );
}

