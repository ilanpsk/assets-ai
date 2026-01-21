import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'select' | 'searchable-select' | 'date';
  options?: { label: string; value: string; description?: string }[];
  className?: string;
  renderDisplay?: (value: string) => React.ReactNode;
}

export function EditableCell({
  value: initialValue,
  onSave,
  type = 'text',
  options = [],
  className,
  renderDisplay,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && type === 'text' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, type]);

  const handleSave = async (newValue: string) => {
    if (newValue === initialValue) {
      setIsEditing(false);
      return;
    }

    try {
      setIsLoading(true);
      await onSave(newValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save', error);
      setValue(initialValue);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave(value);
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (type === 'select') {
      return (
        <Select
          value={value}
          onValueChange={(val) => {
            setValue(val);
            handleSave(val);
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 w-full min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'searchable-select') {
        return (
            <SearchableSelect 
                value={value}
                onValueChange={(val) => {
                    setValue(val);
                    handleSave(val);
                }}
                options={options}
                className="h-8"
                disabled={isLoading}
            />
        );
    }

    if (type === 'date') {
      return (
        <Input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => handleSave(value)}
          disabled={isLoading}
          className="h-8 w-full min-w-[120px]"
        />
      );
    }

    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => handleSave(value)}
        disabled={isLoading}
        className="h-8 w-full min-w-[120px]"
      />
    );
  }

  const displayContent = renderDisplay 
    ? renderDisplay(initialValue)
    : (type === 'select' 
        ? options.find((o) => o.value === initialValue)?.label || initialValue 
        : initialValue) || <span className="text-muted-foreground opacity-50">-</span>;

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-2 py-1 rounded min-h-[2rem] flex items-center w-full",
        className
      )}
    >
      <span className="truncate w-full">
        {displayContent}
      </span>
    </div>
  );
}

