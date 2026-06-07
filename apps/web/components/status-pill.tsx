import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "accent" | "warning" | "muted" | "destructive" | "info";

const toneStyles: Record<Tone, string> = {
  accent:
    "bg-[var(--accent-soft)] text-[var(--accent-strong)] ring-[color-mix(in_srgb,var(--accent-strong)_20%,transparent)]",
  warning:
    "bg-[var(--warning-soft)] text-[var(--warning)] ring-[color-mix(in_srgb,var(--warning)_22%,transparent)]",
  destructive:
    "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-muted text-foreground ring-border",
  muted: "bg-muted text-muted-foreground ring-border",
};

const dotStyles: Record<Tone, string> = {
  accent: "bg-[var(--accent-strong)]",
  warning: "bg-[var(--warning)]",
  destructive: "bg-destructive",
  info: "bg-foreground/60",
  muted: "bg-muted-foreground/60",
};

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function StatusPill({ tone = "muted", children, dot = true, pulse = false, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneStyles[tone],
        className
      )}
    >
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                dotStyles[tone]
              )}
            />
          )}
          <span className={cn("relative inline-flex size-1.5 rounded-full", dotStyles[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}
