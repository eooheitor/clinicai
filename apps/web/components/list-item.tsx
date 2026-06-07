import * as React from "react";
import { cn } from "@/lib/utils";

interface ListItemProps {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ListItem({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onClick,
  className,
  style,
}: ListItemProps) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={style}
      className={cn(
        "surface group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all",
        interactive &&
          "cursor-pointer hover:border-[color-mix(in_srgb,var(--accent-strong)_35%,var(--border))] hover:elevate-md focus-ring",
        className
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {meta && <div className="shrink-0 text-right text-xs text-muted-foreground">{meta}</div>}
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}

/** Round initials/icon avatar used as the leading slot in lists. */
export function ListAvatar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]",
        className
      )}
    >
      {children}
    </span>
  );
}
