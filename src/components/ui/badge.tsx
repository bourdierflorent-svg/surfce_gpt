import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary",
        className,
      )}
      {...props}
    />
  );
}
