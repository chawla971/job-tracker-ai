import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        saved:        "bg-gray-100 text-gray-600          dark:bg-gray-700/50 dark:text-gray-300",
        applied:      "bg-[#E6F1FB] text-[#185FA5]        dark:bg-blue-900/30 dark:text-blue-300",
        networking:   "bg-[#EEEDFE] text-[#3C3489]        dark:bg-purple-900/30 dark:text-purple-300",
        interviewing: "bg-[#FAEEDA] text-[#854F0B]        dark:bg-amber-900/30 dark:text-amber-300",
        offer:        "bg-[#EAF3DE] text-[#27500A]        dark:bg-green-900/30 dark:text-green-300",
        rejected:     "bg-[#FCEBEB] text-[#791F1F]        dark:bg-red-900/30 dark:text-red-300",
        // contact statuses
        awaiting:     "bg-gray-100 text-gray-600          dark:bg-gray-700/50 dark:text-gray-300",
        responded:    "bg-[#E6F1FB] text-[#185FA5]        dark:bg-blue-900/30 dark:text-blue-300",
        scheduled:    "bg-[#EEEDFE] text-[#3C3489]        dark:bg-purple-900/30 dark:text-purple-300",
        done:         "bg-[#EAF3DE] text-[#27500A]        dark:bg-green-900/30 dark:text-green-300",
      },
    },
    defaultVariants: {
      variant: "applied",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
