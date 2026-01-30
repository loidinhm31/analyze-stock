import { useState } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms";
import { TransactionListModal } from "./TransactionListModal";
import { AlertCircle, TrendingUp, Repeat } from "lucide-react";
import { SpendingBottleneck } from "@/types";
import { formatCurrency } from "@/lib/utils";

export interface BottleneckAlertsProps {
  bottlenecks: SpendingBottleneck[];
  valuesHidden?: boolean;
}

export function BottleneckAlerts({
  bottlenecks,
  valuesHidden = false,
}: BottleneckAlertsProps) {
  const [selectedBottleneck, setSelectedBottleneck] = useState<SpendingBottleneck | null>(null);

  if (bottlenecks.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "high_amount":
        return <AlertCircle className="h-4 w-4" />;
      case "high_frequency":
        return <Repeat className="h-4 w-4" />;
      case "trend_increase":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Spending Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bottlenecks.slice(0, 5).map((bottleneck, index) => (
            <Alert
              key={index}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setSelectedBottleneck(bottleneck)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(bottleneck.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{bottleneck.category}</span>
                    <Badge className={getSeverityColor(bottleneck.severity)}>
                      {bottleneck.severity}
                    </Badge>
                  </div>
                  <AlertDescription className="text-sm">
                    {bottleneck.suggestion}
                  </AlertDescription>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      Total:{" "}
                      {valuesHidden
                        ? "*".repeat(formatCurrency(bottleneck.amount).length)
                        : formatCurrency(bottleneck.amount)}
                    </span>
                    <span>Share: {bottleneck.percentage.toFixed(1)}%</span>
                    <span>{bottleneck.transactions.length} transactions</span>
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Transaction List Modal */}
      <TransactionListModal
        isOpen={!!selectedBottleneck}
        onClose={() => setSelectedBottleneck(null)}
        title={selectedBottleneck?.category || ""}
        subtitle={`${selectedBottleneck?.severity} priority`}
        transactions={selectedBottleneck?.transactions || []}
        valuesHidden={valuesHidden}
      />
    </>
  );
}
