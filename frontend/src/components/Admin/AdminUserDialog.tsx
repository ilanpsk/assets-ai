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
import { createUser, updateUser, type User, type UserCreate, type UserUpdate } from '@/api/users';

interface AdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function AdminUserDialog({ open, onOpenChange, user }: AdminUserDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UserCreate & { id?: string }>({
    email: '',
    full_name: '',
    password: '',
    roles: ['admin'],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
        password: '',
        roles: user.roles.map((r: any) => (typeof r === 'string' ? r : r.name)) || ['admin'],
      });
    } else {
      setFormData({
        email: '',
        full_name: '',
        password: '',
        roles: ['admin'],
      });
    }
  }, [user, open]);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'privileged'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UserUpdate) => updateUser(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'privileged'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) {
      const updatePayload: UserUpdate = {
        email: formData.email,
        full_name: formData.full_name,
        roles: formData.roles,
      };
      if (formData.password) {
        updatePayload.password = formData.password;
      }
      updateMutation.mutate(updatePayload);
    } else {
      createMutation.mutate({
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password || undefined,
        roles: formData.roles,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit System User' : 'Add System User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="System Admin"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
                value={formData.roles?.[0] || 'admin'} 
                onValueChange={(val) => setFormData({ ...formData, roles: [val] })}
            >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="it">IT Staff</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? 'New Password (Optional)' : 'Password'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={user ? "Leave blank to keep current" : "Required for local login"}
              required={!user} 
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}







