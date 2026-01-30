import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-[#0041CC]",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[#E4E7EB]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-[#C41535]",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-[#008A69]",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-[#D97706]",
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
