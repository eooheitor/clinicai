"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/segmented";
import { ListSkeleton } from "@/components/skeletons";
import { StatusPill } from "@/components/status-pill";
import {
  Search, Phone, MessageSquare, Users, CalendarDays, ArrowRight, ArrowLeft, Bot, User as UserIcon, UserRound,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, getInitials } from "@/lib/utils";

interface Patient {
  id: string; contactPhone: string; contactName: string | null;
  updatedAt: string; _count: { messages: number };
}
interface Appt { id: string; patientName: string; patientPhone: string; service: string; scheduledAt: string; }
interface Msg { id: string; role: string; content: string; createdAt: string; }
interface Conversation { id: string; messages: Msg[]; triagemCompleta: boolean; humanMode: boolean; }

type Sort = "recentes" | "az";

export default function ClientesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recentes");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [clientAppts, setClientAppts] = useState<Appt[]>([]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    api.get<{ patients: Patient[]; total: number }>(`/panel/patients?${params}`)
      .then((d) => { if (active) setPatients(d.patients); })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [search]);

  useEffect(() => {
    api.get<{ appointments: Appt[] }>("/panel/appointments").then((d) => setAppts(d.appointments)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) { setConv(null); setClientAppts([]); return; }
    setConv(null);
    setClientAppts([]);
    const p = patients.find((x) => x.id === selectedId);
    api.get<Conversation>(`/panel/conversations/${selectedId}`).then(setConv).catch(() => {});
    if (p) {
      api.get<{ appointments: Appt[] }>(`/panel/appointments?phone=${encodeURIComponent(p.contactPhone)}`)
        .then((d) => setClientAppts(d.appointments))
        .catch(() => {});
    }
  }, [selectedId, patients]);

  const sorted = useMemo(() => {
    const arr = [...patients];
    if (sort === "az") arr.sort((a, b) => (a.contactName || a.contactPhone).localeCompare(b.contactName || b.contactPhone));
    else arr.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return arr;
  }, [patients, sort]);

  const selected = patients.find((p) => p.id === selectedId) ?? null;
  const upcomingAppts = clientAppts
    .filter((a) => +new Date(a.scheduledAt) >= Date.now())
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));

  const list = (
    <aside className="flex h-full w-full flex-col border-border md:w-[340px] md:shrink-0 md:border-r lg:w-[380px]">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-foreground">Clientes</h1>
          <span className="text-xs text-muted-foreground">{patients.length}</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente…" className="h-9 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Segmented idBase="cli-sort" value={sort} onChange={setSort} className="w-full" options={[{ value: "recentes", label: "Recentes" }, { value: "az", label: "A–Z" }]} />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto p-2">
        {loading ? (
          <ListSkeleton rows={8} className="p-1" />
        ) : (
          sorted.map((p) => {
            const apptCount = appts.filter((a) => a.patientPhone === p.contactPhone).length;
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn("focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", active ? "bg-[var(--accent-soft)]" : "hover:bg-muted")}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">{getInitials(p.contactName || p.contactPhone)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.contactName || p.contactPhone}</p>
                  <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MessageSquare className="size-3" />{p._count.messages}</span>
                    {apptCount > 0 && <span className="inline-flex items-center gap-1 text-[var(--accent-strong)]"><CalendarDays className="size-3" />{apptCount}</span>}
                  </p>
                </div>
                <span className="shrink-0 text-[0.7rem] text-muted-foreground">{formatDistanceToNow(new Date(p.updatedAt), { locale: ptBR })}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );

  const detail = selected ? (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Profile header */}
      <div className="bg-aurora relative shrink-0 border-b border-border p-6 sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          {isMobile && (
            <Button variant="ghost" size="icon-sm" className="absolute -top-1 left-0" onClick={() => setSelectedId(null)}><ArrowLeft className="size-4" /></Button>
          )}
          <span className="bg-brand flex size-20 items-center justify-center rounded-full font-display text-2xl font-semibold text-white shadow-[0_8px_30px_var(--accent-glow)]">{getInitials(selected.contactName || selected.contactPhone)}</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-semibold text-foreground">{selected.contactName || "Sem nome"}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Phone className="size-3.5" />{selected.contactPhone}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {conv?.triagemCompleta && <StatusPill tone="accent" dot={false}>Triagem concluída</StatusPill>}
              {conv?.humanMode && <StatusPill tone="warning" pulse>Aguardando humano</StatusPill>}
            </div>
          </div>
          <div className="flex gap-2 sm:flex-col lg:flex-row">
            <Button onClick={() => router.push(`/conversas/${selected.id}`)}><MessageSquare className="size-4" /> Abrir conversa</Button>
            <Button variant="outline" render={<a href={`tel:${selected.contactPhone}`} />}><Phone className="size-4" /></Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-2">
        {/* Stats + appointments */}
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Tile icon={MessageSquare} label="Mensagens" value={selected._count.messages} />
            <Tile icon={CalendarDays} label="Consultas" value={clientAppts.length} />
            <Tile icon={UserRound} label="Cliente" value={null} sub={formatDistanceToNow(new Date(selected.updatedAt), { locale: ptBR, addSuffix: true })} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Próximos agendamentos</p>
            {upcomingAppts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppts.map((a) => (
                  <div key={a.id} className="surface flex items-center gap-3 rounded-xl p-3">
                    <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <span className="font-display text-sm font-semibold leading-none">{format(new Date(a.scheduledAt), "dd")}</span>
                      <span className="text-[0.6rem] uppercase">{format(new Date(a.scheduledAt), "MMM", { locale: ptBR })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.service}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(a.scheduledAt), "EEE, HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation preview */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Conversa recente</p>
          <div className="surface space-y-2 rounded-2xl p-4">
            {!conv ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Carregando…</p>
            ) : conv.messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem mensagens.</p>
            ) : (
              conv.messages.slice(-5).map((m) => {
                const isAI = m.role === "assistant";
                return (
                  <div key={m.id} className={cn("flex items-end gap-2", isAI ? "flex-row" : "flex-row-reverse")}>
                    <span className={cn("mb-4 flex size-5 shrink-0 items-center justify-center rounded-full", isAI ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-muted text-muted-foreground")}>
                      {isAI ? <Bot className="size-2.5" /> : <UserIcon className="size-2.5" />}
                    </span>
                    <div className={cn("max-w-[80%] rounded-xl px-3 py-1.5 text-xs", isAI ? "rounded-bl-sm border border-border bg-card" : "rounded-br-sm bg-[color-mix(in_srgb,var(--accent-strong)_16%,var(--card))]")}>
                      <p className="leading-relaxed text-foreground">{m.content}</p>
                      <p className="mt-0.5 text-[0.6rem] text-muted-foreground">{format(new Date(m.createdAt), "HH:mm")}</p>
                    </div>
                  </div>
                );
              })
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/conversas/${selected.id}`)}>Ver conversa completa <ArrowRight className="size-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="hidden h-full flex-1 flex-col items-center justify-center gap-3 text-center md:flex">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Users className="size-8" /></span>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">Seus clientes</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">Selecione um cliente à esquerda para ver o perfil, agendamentos e conversas.</p>
      </div>
    </div>
  );

  if (isMobile) {
    return <div className="h-full">{selectedId ? detail : list}</div>;
  }
  return (
    <div className="flex h-full overflow-hidden">
      {list}
      <div className="min-w-0 flex-1">{detail}</div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: number | null; sub?: string }) {
  return (
    <div className="surface rounded-xl p-3">
      <Icon className="size-4 text-[var(--accent-strong)]" />
      {value !== null ? (
        <p className="mt-2 font-display text-xl font-semibold leading-none text-foreground">{value}</p>
      ) : (
        <p className="mt-2 text-xs font-medium leading-tight text-foreground">{sub}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
