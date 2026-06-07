"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Segmented } from "@/components/segmented";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { CalendarWeek, type CalEvent } from "@/components/calendar-week";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, Phone, X, Plus, Loader2,
} from "lucide-react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  addWeeks, addDays, isSameDay, isSameMonth, isToday, isTomorrow, format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Appt {
  id: string; patientName: string; patientPhone: string;
  service: string; scheduledAt: string; endsAt: string; status: string; notes: string | null;
}

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

export default function AgendamentosPage() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [weekAppts, setWeekAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"semana" | "lista">("semana");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [detail, setDetail] = useState<Appt | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const emptyForm = { patientName: "", patientPhone: "", service: "", date: "", time: "09:00", durationMinutes: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    api.get<{ services?: string[] }>("/panel/settings")
      .then((s) => setServices(Array.isArray(s.services) ? s.services : []))
      .catch(() => {});
  }, []);

  async function load() {
    const data = await api.get<{ appointments: Appt[] }>("/panel/appointments");
    setAppts(data.appointments);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  // Carrega a semana visível por intervalo (inclui passado e dias cheios)
  const weekEnd = addDays(weekStart, 7);
  async function loadWeek() {
    const data = await api.get<{ appointments: Appt[] }>(
      `/panel/appointments?from=${weekStart.toISOString()}&to=${weekEnd.toISOString()}`
    );
    setWeekAppts(data.appointments);
  }
  useEffect(() => {
    loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  async function cancel(id: string) {
    setCanceling(true);
    try {
      await api.patch(`/panel/appointments/${id}/cancel`, {});
      toast.success("Agendamento cancelado");
      setDetail(null);
      load();
      loadWeek();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar");
    } finally {
      setCanceling(false);
    }
  }

  function openCreate() {
    setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd") });
    setShowCreate(true);
  }

  async function createAppointment() {
    if (!form.patientName || !form.service || !form.date || !form.time) {
      toast.error("Preencha nome, serviço, data e hora");
      return;
    }
    const scheduledAt = new Date(`${form.date}T${form.time}`);
    if (isNaN(scheduledAt.getTime())) {
      toast.error("Data/hora inválida");
      return;
    }
    setCreating(true);
    try {
      await api.post("/panel/appointments", {
        patientName: form.patientName,
        patientPhone: form.patientPhone,
        service: form.service,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        notes: form.notes || undefined,
      });
      toast.success("Agendamento criado");
      setShowCreate(false);
      setForm(emptyForm);
      load();
      loadWeek();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar agendamento");
    } finally {
      setCreating(false);
    }
  }

  const weekEvents: CalEvent[] = weekAppts;

  // Mini-month
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(weekStart), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(weekStart), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [weekStart]);
  const daysWithEvents = useMemo(() => new Set(appts.map((a) => format(new Date(a.scheduledAt), "yyyy-MM-dd"))), [appts]);

  const rawLabel = format(weekStart, "MMMM 'de' yyyy", { locale: ptBR });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  // List view groups
  const groups: { label: string; items: Appt[] }[] = [];
  for (const a of [...appts].sort((x, y) => +new Date(x.scheduledAt) - +new Date(y.scheduledAt))) {
    const d = new Date(a.scheduledAt);
    const label = isToday(d) ? "Hoje" : isTomorrow(d) ? "Amanhã" : format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(a);
    else groups.push({ label, items: [a] });
  }

  return (
    <div className={`${wrap} space-y-5`}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
            Hoje
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setWeekStart((w) => addWeeks(w, -1))} aria-label="Semana anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Próxima semana">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
            {monthLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            idBase="agenda-view"
            value={view}
            onChange={setView}
            options={[
              { value: "semana", label: "Semana" },
              { value: "lista", label: "Lista" },
            ]}
          />
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Novo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-[60vh] animate-pulse rounded-2xl bg-muted" />
      ) : view === "semana" ? (
        <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
          {/* Side rail: mini-month */}
          <aside className="hidden xl:block">
            <div className="surface rounded-2xl p-4">
              <p className="mb-3 font-display text-sm font-semibold text-foreground">{monthLabel}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <span key={i} className="text-[0.65rem] font-medium text-muted-foreground">{d}</span>
                ))}
                {monthDays.map((d) => {
                  const inWeek = +d >= +weekStart && +d < +weekEnd;
                  const today = isToday(d);
                  const hasEv = daysWithEvents.has(format(d, "yyyy-MM-dd"));
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => setWeekStart(startOfWeek(d, { weekStartsOn: 0 }))}
                      className={cn(
                        "relative mx-auto flex size-7 items-center justify-center rounded-full text-xs transition-colors",
                        !isSameMonth(d, weekStart) && "text-muted-foreground/40",
                        inWeek && !today && "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
                        today ? "bg-brand font-semibold text-white" : "hover:bg-muted",
                        isSameMonth(d, weekStart) && !inWeek && !today && "text-foreground"
                      )}
                    >
                      {format(d, "d")}
                      {hasEv && !today && (
                        <span className="absolute bottom-0.5 size-1 rounded-full bg-[var(--accent-strong)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  {weekEvents.length} {weekEvents.length === 1 ? "consulta" : "consultas"} nesta semana
                </p>
              </div>
            </div>

            {/* Próximas */}
            <div className="surface mt-4 rounded-2xl p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Próximas</p>
              {appts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma.</p>
              ) : (
                <div className="space-y-1">
                  {appts.slice(0, 5).map((a) => (
                    <button key={a.id} onClick={() => setDetail(a)} className="focus-ring flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-muted">
                      <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                        <span className="font-display text-xs font-semibold leading-none">{format(new Date(a.scheduledAt), "dd")}</span>
                        <span className="text-[0.55rem] uppercase">{format(new Date(a.scheduledAt), "MMM", { locale: ptBR })}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{a.patientName}</p>
                        <p className="truncate text-xs text-muted-foreground">{format(new Date(a.scheduledAt), "EEE HH:mm", { locale: ptBR })} · {a.service}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <CalendarWeek weekStart={weekStart} events={weekEvents} onSelect={(ev) => setDetail(appts.find((a) => a.id === ev.id) ?? null)} />
        </div>
      ) : appts.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sem agendamentos futuros" description="Quando a IA marcar uma consulta, ela aparecerá aqui." />
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2.5">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h2>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setDetail(a)}
                    className="surface hover-lift focus-ring flex w-full items-start gap-4 rounded-xl p-4 text-left"
                  >
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <span className="font-display text-base font-semibold leading-none">{format(new Date(a.scheduledAt), "dd")}</span>
                      <span className="text-[0.65rem] uppercase">{format(new Date(a.scheduledAt), "MMM", { locale: ptBR })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{a.patientName}</p>
                        <Badge variant="accent">{a.service}</Badge>
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="size-3.5" />{format(new Date(a.scheduledAt), "HH:mm")} – {format(new Date(a.endsAt), "HH:mm")}</span>
                        <span className="flex items-center gap-1"><Phone className="size-3.5" />{a.patientPhone}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event detail dialog */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.patientName}</DialogTitle>
                <DialogDescription>
                  {format(new Date(detail.scheduledAt), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="accent">{detail.service}</Badge>
                  <span className="text-muted-foreground">
                    {format(new Date(detail.scheduledAt), "HH:mm")} – {format(new Date(detail.endsAt), "HH:mm")}
                  </span>
                </div>
                <p className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4" />{detail.patientPhone}</p>
                {detail.notes && <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">{detail.notes}</p>}
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Fechar</DialogClose>
                <Button
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => cancel(detail.id)}
                  disabled={canceling}
                >
                  <X className="size-4" /> Cancelar consulta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
            <DialogDescription>Marque uma consulta manualmente na agenda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Nome do paciente" htmlFor="ap-name">
              <Input id="ap-name" value={form.patientName} onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))} placeholder="Maria Oliveira" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp" htmlFor="ap-phone">
                <Input id="ap-phone" value={form.patientPhone} onChange={(e) => setForm((f) => ({ ...f, patientPhone: e.target.value }))} placeholder="5511999999999" />
              </Field>
              <Field label="Serviço" htmlFor="ap-service">
                <Input id="ap-service" list="ap-services" value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} placeholder="Avaliação inicial" />
                <datalist id="ap-services">
                  {services.map((s) => <option key={s} value={s} />)}
                </datalist>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Data" htmlFor="ap-date">
                <Input id="ap-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </Field>
              <Field label="Hora" htmlFor="ap-time">
                <Input id="ap-time" type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </Field>
              <Field label="Duração (min)" htmlFor="ap-dur">
                <Input id="ap-dur" type="number" min={15} step={15} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} placeholder="60" />
              </Field>
            </div>
            <Field label="Observações" htmlFor="ap-notes">
              <Input id="ap-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={createAppointment} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {creating ? "Criando..." : "Criar agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
