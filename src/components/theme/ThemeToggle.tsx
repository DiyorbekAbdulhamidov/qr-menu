"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "@/lib/useAppTheme";
import { cn } from "@/lib/utils";

type Props = {
  mode: ThemeMode;
  onCycle: () => void;
  isDark: boolean;
  className?: string;
};

const labels: Record<ThemeMode, string> = {
  system: "Tizim rejimi (telefon sozlamasi)",
  light: "Yorug' rejim",
  dark: "Qorong'u rejim",
};

export function ThemeToggle({ mode, onCycle, isDark, className }: Props) {
  const Icon = mode === "system" ? Monitor : mode === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={onCycle}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-colors",
        isDark
          ? "border-white/10 bg-[#0d1814]/90 text-[#D4AF37] hover:bg-[#0d1814]"
          : "border-[#0a2f26]/15 bg-white/95 text-[#0a2f26] hover:bg-white",
        className
      )}
      style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      title={labels[mode]}
      aria-label={labels[mode]}
    >
      <Icon size={22} strokeWidth={2} />
    </button>
  );
}
