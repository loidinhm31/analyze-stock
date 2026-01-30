import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface CalendarProps {
  mode?: "single" | "range";
  selected?: Date | { from?: Date; to?: Date };
  onSelect?: (date: Date | { from?: Date; to?: Date } | undefined) => void;
  defaultMonth?: Date;
  numberOfMonths?: number;
  initialFocus?: boolean;
  className?: string;
}

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  defaultMonth,
  numberOfMonths = 1,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    defaultMonth || new Date(),
  );
  const [rangeStart, setRangeStart] = React.useState<Date | undefined>(
    mode === "range" &&
      selected &&
      typeof selected === "object" &&
      "from" in selected
      ? selected.from
      : undefined,
  );

  const handleDateClick = (date: Date) => {
    if (mode === "single") {
      onSelect?.(date);
    } else if (mode === "range") {
      if (!rangeStart) {
        setRangeStart(date);
        onSelect?.({ from: date, to: undefined });
      } else {
        const from = date < rangeStart ? date : rangeStart;
        const to = date < rangeStart ? rangeStart : date;
        onSelect?.({ from, to });
        setRangeStart(undefined);
      }
    }
  };

  const isSelected = (date: Date) => {
    if (mode === "single" && selected instanceof Date) {
      return isSameDay(date, selected);
    } else if (
      mode === "range" &&
      selected &&
      typeof selected === "object" &&
      "from" in selected
    ) {
      const { from, to } = selected;
      if (from && to) {
        return date >= from && date <= to;
      }
      if (from) {
        return isSameDay(date, from);
      }
    }
    return false;
  };

  const renderMonth = (monthOffset: number) => {
    const month = addMonths(currentMonth, monthOffset);
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div key={monthOffset} className="space-y-4">
        <div className="flex justify-between items-center">
          {monthOffset === 0 && (
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-accent rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="font-semibold text-sm">
            {format(month, "MMMM yyyy")}
          </div>
          {monthOffset === numberOfMonths - 1 && (
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-accent rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <div key={day} className="text-muted-foreground font-medium p-2">
              {day}
            </div>
          ))}
          {days.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(day)}
              className={cn(
                "p-2 text-sm rounded-md hover:bg-accent",
                !isSameMonth(day, month) && "text-muted-foreground opacity-50",
                isSelected(day) &&
                  "bg-primary text-primary-foreground hover:bg-primary",
                isSameDay(day, new Date()) && "border border-primary",
              )}
            >
              {format(day, "d")}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("p-3", className)}>
      <div className={cn("grid gap-4", numberOfMonths > 1 && "grid-cols-2")}>
        {Array.from({ length: numberOfMonths }).map((_, i) => renderMonth(i))}
      </div>
    </div>
  );
}
