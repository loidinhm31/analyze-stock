import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/atoms";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
  className?: string;
  icon?: ReactNode;
}

export function StatCard({
  title,
  value,
  subtitle,
  valueColor = "#111827",
  className,
  icon,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
        <CardTitle
          className="text-xs sm:text-sm font-medium"
          style={{ color: "#374151" }}
        >
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div
          className="text-lg sm:text-2xl font-bold font-heading"
          style={{ color: valueColor }}
        >
          {value}
        </div>
        {subtitle && (
          <p
            className={cn("text-[10px] sm:text-xs hidden sm:block")}
            style={{ color: "#6B7280" }}
          >
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
