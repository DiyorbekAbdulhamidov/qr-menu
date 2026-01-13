import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", isLoading, children, ...props }, ref) => {
    const variants = {
      primary: "bg-black text-white hover:bg-neutral-800",
      outline: "border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900",
      ghost: "hover:bg-neutral-100 text-neutral-600",
      danger: "bg-red-50 text-red-600 hover:bg-red-100",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50",
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading ? "Loading..." : children}
      </button>
    );
  }
);
Button.displayName = "Button";
export { Button };