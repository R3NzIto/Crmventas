import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded border border-outline-variant bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors placeholder:text-secondary focus:border-primary focus-visible:ring-1 focus-visible:ring-primary",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
