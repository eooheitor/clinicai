"use client";

import { useEffect, useState } from "react";
import { addDays, isSameDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface CalEvent {
  id: string;
  patientName: string;
  service: string;
  scheduledAt: string;
  endsAt: string;
}

const HOUR_H = 60; // px per hour

export function CalendarWeek({
  weekStart,
  events,
  onSelect,
}: {
  weekStart: Date;
  events: CalEvent[];
  onSelect: (ev: CalEvent) => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Dynamic visible range so events always fit
  let startHour = 8;
  let endHour = 19;
  if (events.length) {
    const starts = events.map((e) => new Date(e.scheduledAt).getHours());
    const ends = events.map((e) => {
      const d = new Date(e.endsAt);
      return d.getMinutes() > 0 ? d.getHours() + 1 : d.getHours();
    });
    startHour = Math.max(6, Math.min(8, ...starts));
    endHour = Math.min(23, Math.max(19, ...ends));
  }
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalH = hours.length * HOUR_H;

  function topFor(date: Date) {
    return (date.getHours() - startHour + date.getMinutes() / 60) * HOUR_H;
  }

  return (
    <div className="surface overflow-hidden rounded-2xl">
      {/* Day headers */}
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border">
        <div className="border-r border-border" />
        {days.map((d) => {
          const today = now ? isSameDay(d, now) : false;
          return (
            <div key={d.toISOString()} className="border-r border-border py-2 text-center last:border-r-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                {format(d, "EEE", { locale: ptBR })}
              </p>
              <p
                className={cn(
                  "mx-auto mt-1 flex size-8 items-center justify-center rounded-full font-display text-base font-semibold",
                  today ? "bg-brand text-white" : "text-foreground"
                )}
              >
                {format(d, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="no-scrollbar max-h-[calc(100dvh-13rem)] overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          {/* Hour gutter */}
          <div className="relative border-r border-border" style={{ height: totalH }}>
            {hours.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_H }}>
                <span className="absolute -top-2 right-2 text-[0.65rem] text-muted-foreground">
                  {h.toString().padStart(2, "0")}h
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const dayEvents = events
              .filter((e) => isSameDay(new Date(e.scheduledAt), d))
              .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
            const today = now ? isSameDay(d, now) : false;
            const nowTop = now ? topFor(now) : 0;
            const nowVisible = today && now && now.getHours() >= startHour && now.getHours() < endHour;

            return (
              <div key={d.toISOString()} className="relative border-r border-border last:border-r-0" style={{ height: totalH }}>
                {/* hour lines */}
                {hours.map((h) => (
                  <div key={h} className="border-b border-border" style={{ height: HOUR_H }} />
                ))}

                {/* now line */}
                {nowVisible && (
                  <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: nowTop }}>
                    <div className="relative">
                      <span className="absolute -left-1 -top-1 size-2 rounded-full bg-destructive" />
                      <div className="h-px w-full bg-destructive" />
                    </div>
                  </div>
                )}

                {/* events */}
                {dayEvents.map((ev) => {
                  const start = new Date(ev.scheduledAt);
                  const end = new Date(ev.endsAt);
                  const top = Math.max(0, topFor(start));
                  const height = Math.max(26, Math.min(totalH - top, ((+end - +start) / 3_600_000) * HOUR_H - 3));
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onSelect(ev)}
                      style={{ top, height }}
                      className="focus-ring group absolute inset-x-1 z-10 cursor-pointer overflow-hidden rounded-lg border-l-[3px] border-[var(--accent-strong)] bg-[color-mix(in_srgb,var(--accent-strong)_16%,var(--card))] px-2 py-1 text-left transition-all hover:z-30 hover:bg-[color-mix(in_srgb,var(--accent-strong)_26%,var(--card))] hover:elevate-md hover:ring-1 hover:ring-[var(--accent-strong)]"
                    >
                      <p className="truncate text-[0.72rem] font-semibold leading-tight text-foreground">{ev.patientName}</p>
                      <p className="truncate text-[0.66rem] leading-tight text-muted-foreground">
                        {format(start, "HH:mm")} · {ev.service}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
