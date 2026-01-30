import { useState } from "react";
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export interface DateRangeFilterProps {
  dateRange?: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  };
  onApply: (dateRange: { startDate: Date; endDate: Date }) => void;
  onClear: () => void;
}

export function DateRangeFilter({
  dateRange,
  onApply,
  onClear,
}: DateRangeFilterProps) {
  const [date, setDate] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: dateRange?.startDate,
    to: dateRange?.endDate,
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleApply = () => {
    if (date.from && date.to) {
      onApply({
        startDate: date.from,
        endDate: date.to,
      });
      setIsPopoverOpen(false);
    }
  };

  const handleClear = () => {
    setDate({ from: undefined, to: undefined });
    onClear();
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[300px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date.from}
            selected={
              date.from && date.to
                ? { from: date.from, to: date.to }
                : date.from
            }
            onSelect={(range) => {
              if (range && typeof range === "object" && "from" in range) {
                setDate({ from: range.from, to: range.to });
              }
            }}
            numberOfMonths={2}
          />
          <div className="p-3 border-t flex gap-2">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!date.from || !date.to}
            >
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
