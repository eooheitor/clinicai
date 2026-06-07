"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/motion";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "warning";
  badge?: React.ReactNode;
  data?: number[];
  className?: string;
}

const toneStyles = {
  default: "text-[var(--accent-strong)]",
  warning: "text-[var(--warning)]",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  badge,
  data,
  className,
}: StatCardProps) {
  const chartData = (data ?? []).map((v, i) => ({ i, v }));
  const gradId = React.useId().replace(/:/g, "");

  return (
    <div
      className={cn(
        "surface hover-lift group relative flex flex-col overflow-hidden rounded-2xl p-5",
        tone === "warning" && "ring-1 ring-[color-mix(in_srgb,var(--warning)_25%,transparent)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            tone === "warning" ? "bg-[var(--warning-soft)]" : "bg-[var(--accent-soft)]",
            toneStyles[tone]
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        {badge}
      </div>

      <div className="mt-4">
        <AnimatedNumber
          value={value}
          className="font-display text-[2.25rem] font-semibold leading-none tracking-[-0.02em] text-foreground"
        />
        <div className="mt-2 text-sm text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground/70">{hint}</div>}
      </div>

      {chartData.length > 1 && (
        <div className="mt-3 -mb-1 h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-strong)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent-strong)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--accent-strong)"
                strokeWidth={2}
                fill={`url(#${gradId})`}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
