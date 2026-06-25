"use client";

import { cn } from "@/lib/utils";
import {
  Sparkles, Smile, Stethoscope, Apple, Activity, Brain, PawPrint, Dumbbell,
  HeartPulse, Check, CircleSlash, type LucideIcon,
} from "lucide-react";

// Cada área clínica ganha um ícone-identidade; presets desconhecidos caem no genérico.
const AREA_ICONS: Record<string, LucideIcon> = {
  "Estética": Sparkles,
  "Odontologia": Smile,
  "Medicina": Stethoscope,
  "Nutrição": Apple,
  "Fisioterapia": Activity,
  "Psicologia": Brain,
  "Veterinária": PawPrint,
  "Educação Física": Dumbbell,
};
const DEFAULT_AREA_ICON = HeartPulse;

export interface PresetOptionLike {
  id: string;
  name: string;
  description?: string | null;
}

interface PresetPickerProps {
  presets: PresetOptionLike[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Inclui um card "Sem preset (legado)" que seleciona null. */
  allowNone?: boolean;
}

export function PresetPicker({ presets, value, onChange, allowNone = false }: PresetPickerProps) {
  const selected = presets.find((p) => p.id === value);

  return (
    <div className="space-y-2.5">
      <div role="radiogroup" aria-label="Área de atuação" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {presets.map((p) => {
          const Icon = AREA_ICONS[p.name] ?? DEFAULT_AREA_ICON;
          const active = value === p.id;
          return (
            <Card
              key={p.id}
              active={active}
              onClick={() => onChange(p.id)}
              icon={Icon}
              label={p.name}
            />
          );
        })}

        {allowNone && (
          <Card
            active={value === null}
            onClick={() => onChange(null)}
            icon={CircleSlash}
            label="Sem preset"
            muted
          />
        )}
      </div>

      {selected?.description ? (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--accent-strong)]/20 bg-[var(--accent-soft)] px-3 py-2">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--accent-strong)]" />
          <p className="text-xs leading-relaxed text-muted-foreground">{selected.description}</p>
        </div>
      ) : null}

      {allowNone && value === null && (
        <p className="text-xs leading-relaxed text-muted-foreground/70">
          Sem preset, a clínica usa o comportamento legado (texto livre escrito pelo cliente), sem escopo travado.
        </p>
      )}
    </div>
  );
}

function Card({
  active, onClick, icon: Icon, label, muted = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "focus-ring group relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all",
        active
          ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_var(--accent-strong),0_10px_30px_-14px_var(--cta-glow)]"
          : "border-border hover:border-[var(--accent-strong)]/60"
      )}
    >
      {active && (
        <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--accent-strong)] text-background">
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      )}
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg transition-all motion-safe:group-hover:scale-105",
          active
            ? "bg-[var(--accent-strong)] text-background"
            : muted
              ? "bg-muted text-muted-foreground"
              : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className={cn("text-xs font-medium leading-tight", active ? "text-[var(--accent-strong)]" : "text-foreground")}>
        {label}
      </span>
    </button>
  );
}
