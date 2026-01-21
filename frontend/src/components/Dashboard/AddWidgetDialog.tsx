import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Check, PlusCircle } from 'lucide-react';

export interface WidgetDefinition {
  id: string;
  type: 'stat' | 'chart' | 'list';
  title: string;
  defaultW: number;
  defaultH: number;
  config?: any;
}

const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  { id: 'stat-maintenance', type: 'stat', title: 'Maintenance Status', defaultW: 3, defaultH: 3 },
  { id: 'req-summary', type: 'stat', title: 'Request Summary', defaultW: 3, defaultH: 3 },
  { id: 'loc-chart', type: 'chart', title: 'Assets by Location', defaultW: 6, defaultH: 8 },
  { id: 'recent-assets', type: 'list', title: 'Recently Added Assets', defaultW: 4, defaultH: 8 },
  { id: 'custom-stat', type: 'stat', title: 'Status Counter', defaultW: 3, defaultH: 3 },
];

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (widget: WidgetDefinition, config?: any) => void;
  existingWidgets: string[];
  statusOptions: string[];
}

export function AddWidgetDialog({ 
  open, onOpenChange, onAdd, existingWidgets, statusOptions 
}: AddWidgetDialogProps) {
  const [selectedWidget, setSelectedWidget] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const handleAdd = () => {
    const def = AVAILABLE_WIDGETS.find(w => w.id === selectedWidget);
    if (!def) return;

    let config = undefined;
    if (def.id === 'custom-stat') {
      if (!selectedStatus) return;
      config = { status: selectedStatus };
    }

    onAdd(def, config);
    onOpenChange(false);
    setSelectedWidget('');
    setSelectedStatus('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Dashboard Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard view.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Widget Type</label>
            <Select value={selectedWidget} onValueChange={setSelectedWidget}>
              <SelectTrigger>
                <SelectValue placeholder="Select widget..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Stats & Counters</SelectLabel>
                  <SelectItem 
                    value="stat-maintenance" 
                    disabled={existingWidgets.includes('stat-maintenance')}
                  >
                    Maintenance Status
                    {existingWidgets.includes('stat-maintenance') && <Check className="ml-2 h-4 w-4 inline" />}
                  </SelectItem>
                  <SelectItem 
                    value="req-summary" 
                    disabled={existingWidgets.includes('req-summary')}
                  >
                    Request Summary
                    {existingWidgets.includes('req-summary') && <Check className="ml-2 h-4 w-4 inline" />}
                  </SelectItem>
                  <SelectItem value="custom-stat">Status Counter (Custom)</SelectItem>
                  <SelectLabel>Charts & Lists</SelectLabel>
                  <SelectItem 
                    value="loc-chart"
                    disabled={existingWidgets.includes('loc-chart')}
                  >
                    Assets by Location
                    {existingWidgets.includes('loc-chart') && <Check className="ml-2 h-4 w-4 inline" />}
                  </SelectItem>
                  <SelectItem 
                    value="recent-assets"
                    disabled={existingWidgets.includes('recent-assets')}
                  >
                    Recently Added Assets
                    {existingWidgets.includes('recent-assets') && <Check className="ml-2 h-4 w-4 inline" />}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {selectedWidget === 'custom-stat' && (
             <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
               <label className="text-sm font-medium">Select Status to Track</label>
               <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                 <SelectTrigger>
                   <SelectValue placeholder="Choose status..." />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectGroup>
                     {statusOptions.map(status => (
                       <SelectItem key={status} value={status}>
                         {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                       </SelectItem>
                     ))}
                   </SelectGroup>
                 </SelectContent>
               </Select>
             </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!selectedWidget || (selectedWidget === 'custom-stat' && !selectedStatus)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

