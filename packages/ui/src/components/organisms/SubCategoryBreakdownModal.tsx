import { ChevronRight, Layers, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  CategoryIcon,
} from "@money-insight/ui/components/atoms";
import { formatCurrency } from "@money-insight/ui/lib";
import { useCategoryIcon } from "@money-insight/ui/hooks";
import type { CategorySpending } from "@money-insight/ui/types";

export interface SubCategoryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentCategory: string;
  subCategories: CategorySpending[];
  onSubCategorySelect: (subCategory: CategorySpending) => void;
  valuesHidden?: boolean;
}

export function SubCategoryBreakdownModal({
  isOpen,
  onClose,
  parentCategory,
  subCategories,
  onSubCategorySelect,
  valuesHidden = false,
}: SubCategoryBreakdownModalProps) {
  const { getIcon } = useCategoryIcon();
  const maskValue = (value: string) => "*".repeat(value.length);
  const parentIcon = getIcon(parentCategory);

  const totalAmount = subCategories.reduce((sum, cat) => sum + cat.total, 0);
  const totalCount = subCategories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {parentIcon ? (
                <CategoryIcon
                  name={parentIcon}
                  size={24}
                  className="text-primary"
                />
              ) : (
                <Layers className="h-5 w-5 text-primary" />
              )}
              <DialogTitle className="text-lg">{parentCategory}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
            <span>{subCategories.length} sub-categories</span>
            <span>
              {totalCount} transactions •{" "}
              {valuesHidden
                ? maskValue(formatCurrency(totalAmount))
                : formatCurrency(totalAmount)}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
          <div className="space-y-2">
            {subCategories.map((subCat) => {
              const formattedAmount = formatCurrency(subCat.total);
              return (
                <button
                  key={subCat.category}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                  onClick={() => onSubCategorySelect(subCat)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {subCat.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subCat.count} transactions •{" "}
                      {subCat.percentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm text-destructive">
                      {valuesHidden
                        ? maskValue(formattedAmount)
                        : formattedAmount}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
