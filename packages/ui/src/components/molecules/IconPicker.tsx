import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Input,
  CategoryIcon,
  CATEGORY_ICONS,
} from "@money-insight/ui/components/atoms";
import { cn } from "@money-insight/ui/lib";

export interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
  /** "sm" (default 36px/20px) or "lg" (48px/28px) */
  triggerSize?: "sm" | "lg";
}

const iconEntries = Object.entries(CATEGORY_ICONS);

export function IconPicker({
  value,
  onChange,
  className,
  triggerSize = "sm",
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? iconEntries.filter(
        ([key, entry]) =>
          entry.label.toLowerCase().includes(search.toLowerCase()) ||
          key.toLowerCase().includes(search.toLowerCase()),
      )
    : iconEntries;

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearch("");
  };

  const isLg = triggerSize === "lg";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={isLg ? "default" : "sm"}
          className={cn(isLg ? "h-12 w-12 p-0" : "h-9 w-9 p-0", className)}
          title={value ? CATEGORY_ICONS[value]?.label : "Pick icon"}
        >
          {value ? (
            <CategoryIcon name={value} size={isLg ? 28 : 20} />
          ) : (
            <span className="text-muted-foreground text-xs">?</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 mb-2 text-sm"
          autoFocus
        />
        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
          {filtered.map(([key, entry]) => (
            <button
              key={key}
              type="button"
              className={cn(
                "flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-colors",
                value === key && "bg-primary/15 ring-1 ring-primary",
              )}
              onClick={() => handleSelect(key)}
              title={entry.label}
            >
              <CategoryIcon name={key} size={22} />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-6 text-xs text-muted-foreground text-center py-3">
              No icons found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
