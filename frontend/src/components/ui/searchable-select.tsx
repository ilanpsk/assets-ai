import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface Option {
  label: string
  value: string
  description?: string
}

interface SearchableSelectProps {
  value?: string
  onValueChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    const lower = searchQuery.toLowerCase()
    return options.filter((opt) => 
        opt.label.toLowerCase().includes(lower) || 
        opt.description?.toLowerCase().includes(lower)
    )
  }, [options, searchQuery])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
          disabled={disabled}
        >
          <span className="truncate">
             {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="min-w-[--radix-dropdown-menu-trigger-width] w-auto max-w-[300px] p-0" 
        align="start"
      >
        <div className="flex items-center border-b px-3 py-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input 
            className="flex h-9 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 px-0"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="overflow-y-auto max-h-[250px]">
          <div className="p-1">
             {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    No results found.
                </div>
             ) : (
                filteredOptions.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => {
                            onValueChange(option.value)
                            setOpen(false)
                            setSearchQuery("")
                        }}
                        className="cursor-pointer"
                    >
                        <Check
                            className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === option.value ? "opacity-100" : "opacity-0"
                            )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="break-words">{option.label}</span>
                            {option.description && (
                                <span className="text-xs text-muted-foreground break-words">{option.description}</span>
                            )}
                        </div>
                    </DropdownMenuItem>
                ))
             )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

