import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Plug,
  Construction
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { getIntegrations, deleteIntegration, type Integration } from '@/api/integrations';
import { IntegrationDialog } from './IntegrationDialog';

export function Integrations() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: getIntegrations,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setIntegrationToDelete(null);
    },
  });

  const handleEdit = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsDialogOpen(true);
  };

  const handleDelete = (integration: Integration) => {
    setIntegrationToDelete(integration);
  };

  const handleAddNew = () => {
    setSelectedIntegration(null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
      return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-full">
            <Construction className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-700 dark:text-amber-300">Coming Soon</h4>
            <p className="text-sm text-muted-foreground">
              Third-party integrations are under development. Stay tuned for connections to popular IT tools and services.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium">Connected Services</h3>
        </div>
        <Button onClick={handleAddNew} disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add Integration
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations?.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                  No integrations configured.
              </div>
          )}
          {integrations?.map((integration) => (
              <Card key={integration.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                          {integration.name}
                      </CardTitle>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(integration)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(integration)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-2">
                          <Plug className="h-5 w-5 text-muted-foreground" />
                          <span className="capitalize text-lg">{integration.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {integration.enabled ? (
                             <Badge variant="default">Active</Badge>
                        ) : (
                             <Badge variant="secondary">Disabled</Badge>
                        )}
                      </p>
                  </CardContent>
              </Card>
          ))}
      </div>

      <IntegrationDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        integration={selectedIntegration}
      />

    <AlertDialog open={!!integrationToDelete} onOpenChange={(open) => !open && setIntegrationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the integration 
              "{integrationToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => integrationToDelete && deleteMutation.mutate(integrationToDelete.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}







