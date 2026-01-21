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
import { createUser, updateUser, type User, type UserCreate, type UserUpdate } from '@/api/users';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UserCreate & { id?: string; employment_end_date?: string }>({
    email: '',
    full_name: '',
    password: '',
    employment_end_date: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
        password: '', // Don't fill password on edit
        employment_end_date: user.employment_end_date || '',
      });
    } else {
      setFormData({
        email: '',
        full_name: '',
        password: '',
        employment_end_date: '',
      });
    }
  }, [user, open]);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UserUpdate) => updateUser(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) {
      const updatePayload: UserUpdate = {
        email: formData.email,
        full_name: formData.full_name,
        employment_end_date: formData.employment_end_date || null,
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
        roles: ['user'], // Force 'user' role for assignees
        employment_end_date: formData.employment_end_date || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit Person' : 'Add Person'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? 'New Password (Optional)' : 'Password (Optional)'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={user ? "Leave blank to keep current" : "Optional for SSO users"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employment_end_date">Employment End Date (Optional)</Label>
            <Input
              id="employment_end_date"
              type="date"
              value={formData.employment_end_date || ''}
              onChange={(e) => setFormData({ ...formData, employment_end_date: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? 'Save Changes' : 'Add Person'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}





