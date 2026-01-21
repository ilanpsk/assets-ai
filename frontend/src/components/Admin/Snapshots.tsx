import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, RotateCcw, Trash2, Database, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getSnapshots, createSnapshot, rollbackSnapshot, deleteSnapshot, exportSnapshot } from "@/api/admin";

export function Snapshots() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState("");
  const [newSnapshotDesc, setNewSnapshotDesc] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["snapshots"],
    queryFn: getSnapshots,
  });

  const createMutation = useMutation({
    mutationFn: createSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      setIsCreateOpen(false);
      setNewSnapshotName("");
      setNewSnapshotDesc("");
      toast.success("Snapshot Created", {
        description: "The system state has been successfully saved.",
      });
    },
    onError: (error: any) => {
      toast.error("Creation Failed", {
        description: error.response?.data?.detail || "Could not create snapshot",
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: rollbackSnapshot,
    onSuccess: () => {
      // Invalidate everything since state changed completely
      queryClient.invalidateQueries();
      toast.success("System Restored", {
        description: "The database has been rolled back to the selected snapshot.",
      });
      // Optionally reload page to ensure all local state is fresh
      window.location.reload();
    },
    onError: (error: any) => {
      toast.error("Rollback Failed", {
        description: error.response?.data?.detail || "Could not restore snapshot",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      toast.success("Snapshot Deleted", {
        description: "The snapshot has been removed.",
      });
    },
    onError: (error: any) => {
      toast.error("Delete Failed", {
        description: error.response?.data?.detail || "Could not delete snapshot",
      });
    },
  });

  const handleCreate = () => {
    if (!newSnapshotName.trim()) return;
    createMutation.mutate({
      name: newSnapshotName,
      description: newSnapshotDesc,
    });
  };

  const handleExport = async (snapshot: any) => {
    try {
      setExportingId(snapshot.id);
      const blob = await exportSnapshot(snapshot.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snapshot_${snapshot.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${format(new Date(), 'yyyyMMdd')}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Export Started", {
        description: "Snapshot download has started."
      });
    } catch (error) {
      toast.error("Export Failed", {
        description: "Could not export snapshot."
      });
    } finally {
      setExportingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">System Snapshots</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage point-in-time snapshots of the entire database.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Take Snapshot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Snapshot</DialogTitle>
              <DialogDescription>
                This will save the current state of all assets, users, and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newSnapshotName}
                  onChange={(e) => setNewSnapshotName(e.target.value)}
                  placeholder="e.g. Before Import"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={newSnapshotDesc}
                  onChange={(e) => setNewSnapshotDesc(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Snapshot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Entities</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots?.map((snapshot) => (
              <TableRow key={snapshot.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{snapshot.name}</span>
                    {snapshot.description && (
                      <span className="text-xs text-muted-foreground">
                        {snapshot.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(snapshot.created_at), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {snapshot.entity_counts?.assets || 0} Assets
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      {snapshot.entity_counts?.users || 0} Users
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExport(snapshot)}
                      disabled={exportingId === snapshot.id}
                    >
                      {exportingId === snapshot.id ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-3 w-3" />
                      )}
                      Export
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                          <RotateCcw className="mr-2 h-3 w-3" />
                          Rollback
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rollback to this snapshot?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will <strong>permanently delete</strong> all current data created after this snapshot 
                            and restore the system state to {format(new Date(snapshot.created_at), "MMM d, yyyy HH:mm")}.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => rollbackMutation.mutate(snapshot.id)}
                            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
                          >
                            {rollbackMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirm Rollback
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the snapshot "{snapshot.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(snapshot.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {snapshots?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No snapshots found. Create one to backup your system.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

