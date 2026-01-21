import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoles, getPermissions, createRole, updateRolePermissions, deleteRole } from '@/api/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function RoleManager() {
  const queryClient = useQueryClient();
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: getPermissions,
  });

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => createRole(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setNewRoleName('');
      toast.success('Role created');
    },
    onError: () => toast.error('Failed to create role'),
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ roleName, perms }: { roleName: string; perms: string[] }) =>
      updateRolePermissions(roleName, perms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsPermissionDialogOpen(false);
      toast.success('Permissions updated');
    },
    onError: () => toast.error('Failed to update permissions'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted');
    },
    onError: () => toast.error('Failed to delete role'),
  });

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim()) {
      createRoleMutation.mutate(newRoleName);
    }
  };

  const handleManagePermissions = (roleName: string) => {
    setSelectedRole(roleName);
    setIsPermissionDialogOpen(true);
  };

  const handleTogglePermission = (slug: string, currentPerms: string[]) => {
    if (!selectedRole) return;
    
    const newPerms = currentPerms.includes(slug)
      ? currentPerms.filter(p => p !== slug)
      : [...currentPerms, slug];
      
    updatePermissionsMutation.mutate({ roleName: selectedRole, perms: newPerms });
  };

  // Group permissions by prefix for better UI
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const prefix = perm.slug.split(':')[0];
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const selectedRoleData = roles.find(r => r.name === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">Manage user roles and their access levels.</p>
        </div>
        
        <form onSubmit={handleCreateRole} className="flex gap-2">
          <Input 
            placeholder="New role name..." 
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className="w-48"
          />
          <Button type="submit" disabled={!newRoleName.trim() || createRoleMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </form>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Permissions Count</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingRoles ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">Loading...</TableCell>
              </TableRow>
            ) : roles.map((role) => (
              <TableRow key={role.name}>
                <TableCell className="font-medium capitalize">{role.name}</TableCell>
                <TableCell>{role.permissions.length} permissions</TableCell>
                <TableCell>
                  <div className="flex w-full flex-row flex-nowrap items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleManagePermissions(role.name)}>
                      <Shield className="mr-2 h-3 w-3" />
                      Permissions
                    </Button>
                    {role.name !== 'admin' ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this role?')) {
                            deleteRoleMutation.mutate(role.name);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="w-9 h-9" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions: {selectedRole}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {Object.entries(groupedPermissions).map(([prefix, perms]) => (
              <div key={prefix} className="border rounded-lg p-4">
                <h3 className="font-medium capitalize mb-3 border-b pb-2">{prefix} Management</h3>
                <div className="space-y-3">
                  {perms.map((perm) => {
                    const isChecked = selectedRoleData?.permissions.some(p => p.slug === perm.slug) ?? false;
                    return (
                      <div key={perm.slug} className="flex items-start space-x-2">
                        <Checkbox 
                          id={perm.slug} 
                          checked={isChecked}
                          onCheckedChange={() => {
                            if (!selectedRoleData) return;
                            const currentPerms = selectedRoleData.permissions.map(p => p.slug);
                            handleTogglePermission(perm.slug, currentPerms);
                          }}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor={perm.slug} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {perm.slug}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


