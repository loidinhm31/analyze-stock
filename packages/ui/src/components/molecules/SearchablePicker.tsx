import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@money-insight/ui/components/atoms";
import { cn } from "@money-insight/ui/lib";

export interface SearchablePickerOption {
  value: string;
  label: string;
}

interface SearchablePickerProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchablePickerOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  triggerId?: string;
  renderTriggerValue?: (value: string) => React.ReactNode;
  renderOptionIcon?: (option: SearchablePickerOption) => React.ReactNode;
}

export function SearchablePicker({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  triggerId,
  renderTriggerValue,
  renderOptionIcon,
}: SearchablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch),
    );
  }, [options, search]);

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={triggerId}
          className="w-full min-w-0 justify-between overflow-hidden bg-(--color-bg-white) text-(--color-text-primary) border-(--color-border-light)"
          disabled={disabled}
        >
          {renderTriggerValue ? (
            renderTriggerValue(value)
          ) : (
            <span className={cn("min-w-0 truncate", !value && "text-(--color-text-muted)")}>
              {value || placeholder}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-(--color-text-muted)" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-2 bg-(--color-bg-white) border-(--color-border-light)"
        align="start"
      >
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2"
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-(--color-text-primary) hover:bg-(--color-primary-500)/10 focus:bg-(--color-primary-500)/15",
                    selected && "bg-(--color-primary-500)/15",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  {renderOptionIcon ? renderOptionIcon(option) : null}
                  <span className="flex-1 truncate">{option.label}</span>
                  {selected ? <Check className="h-4 w-4 text-(--color-primary-500)" /> : null}
                </button>
              );
            })
          ) : (
            <p className="px-2 py-3 text-sm text-(--color-text-muted)">
              {emptyMessage}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
