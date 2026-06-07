"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { StatGridSkeleton, CardSkeleton } from "@/components/skeletons";
import { StatusPill } from "@/components/status-pill";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { cn, getInitials, maskPhoneBR } from "@/lib/utils";
import {
  MessageSquare, Calendar, Users, UserCog, ArrowRight, Clock, Sparkles, CalendarClock, PieChart as PieIcon,
} from "lucide-react";
import {
  Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashData {
  totalConversations: number;
  activeToday: number;
  humanModeCount: number;
  triagemCount: number;
  appointmentsToday: number;
  appointmentsWeek: number;
  totalPatients: number;
  topServices: { service: string; count: number }[];
  messagesLast7Days: { day: string; count: number }[];
}
interface Appt { id: string; patientName: string; service: string; scheduledAt: string; patientPhone: string; }
interface Conv {
  id: string; contactName: string | null; contactPhone: string;
  humanMode: boolean; triagemCompleta: boolean; updatedAt: string;
  messages: { content: string; role: string }[];
}

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [attention, setAttention] = useState<Conv[]>([]);
  const [recent, setRecent] = useState<Conv[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user] = useState(() => getUser());
  const chart = useChartTheme();

  useEffect(() => {
    api.get<DashData>("/panel/dashboard").then(setData).catch((e) => setError(e.message));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    api
      .get<{ appointments: Appt[] }>(`/panel/appointments?from=${start.toISOString()}&to=${end.toISOString()}`)
      .then((d) => setAppts(d.appointments))
      .catch(() => {});
    api.get<{ conversations: Conv[] }>("/panel/conversations?humanMode=true").then((d) => setAttention(d.conversations.slice(0, 5))).catch(() => {});
    api.get<{ conversations: Conv[] }>("/panel/conversations").then((d) => setRecent(d.conversations.slice(0, 6))).catch(() => {});
  }, []);

  if (error) {
    return (
      <div className={wrap}>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">Erro ao carregar dashboard: {error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={`${wrap} space-y-6`}>
        <div className="h-28 animate-pulse rounded-3xl bg-muted" />
        <StatGridSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const firstName = (user?.name ?? "").split(" ")[0] || "por aqui";
  const chartData = data.messagesLast7Days.map((d) => ({ day: format(new Date(d.day), "EEE", { locale: ptBR }), mensagens: d.count }));
  const spark = data.messagesLast7Days.map((d) => d.count);
  const todayAppts = [...appts].sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));

  const concluidas = data.triagemCount;
  const andamento = Math.max(0, data.totalConversations - concluidas);
  const donut = [
    { name: "Triagem concluída", value: concluidas, color: chart.accent },
    { name: "Em andamento", value: andamento, color: "var(--muted-foreground)" },
  ];

  const topServices: [string, number][] = (data.topServices ?? []).map((s) => [s.service, s.count]);
  const maxService = topServices[0]?.[1] ?? 1;

  const kpis = [
    { icon: MessageSquare, label: "Conversas hoje", value: data.activeToday, data: spark },
    { icon: Calendar, label: "Consultas hoje", value: data.appointmentsToday },
    {
      icon: UserCog, label: "Aguardando humano", value: data.humanModeCount,
      tone: data.humanModeCount > 0 ? ("warning" as const) : ("default" as const),
      badge: data.humanModeCount > 0 ? <StatusPill tone="warning" pulse>ação</StatusPill> : undefined,
    },
    { icon: Users, label: "Total de clientes", value: data.totalPatients },
  ];

  return (
    <div className={`${wrap} space-y-4`}>
      {/* Hero */}
      <Reveal>
        <div className="bg-aurora surface relative overflow-hidden rounded-3xl px-6 py-7 sm:px-8">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--accent-strong)]">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">{greeting()}, {firstName}.</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {data.humanModeCount > 0
                  ? `${data.humanModeCount} ${data.humanModeCount === 1 ? "conversa precisa" : "conversas precisam"} da sua atenção agora.`
                  : "Tudo sob controle — sua IA está cuidando do atendimento."}
              </p>
            </div>
            <Link href={data.humanModeCount > 0 ? "/conversas" : "/agendamentos"} className="bg-brand inline-flex shrink-0 items-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-[0_6px_20px_var(--accent-glow)] transition-transform hover:scale-[1.02]">
              {data.humanModeCount > 0 ? "Ver conversas" : "Ver agenda"} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-12 gap-4">
        {/* KPIs */}
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.05} className="col-span-12 sm:col-span-6 xl:col-span-3">
            <StatCard icon={k.icon} label={k.label} value={k.value} tone={k.tone} badge={k.badge} data={k.data} className="h-full" />
          </Reveal>
        ))}

        {/* Chart */}
        <Reveal delay={0.1} className="col-span-12 xl:col-span-8">
          <section className="surface elevate-sm h-full rounded-2xl p-5">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]"><MessageSquare className="size-4" /></span>
              <div>
                <h2 className="font-display text-[0.95rem] font-semibold text-foreground">Mensagens recebidas</h2>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.accent} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={chart.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: chart.text }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: chart.text }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                <Tooltip contentStyle={{ background: chart.card, border: `1px solid ${chart.border}`, borderRadius: 12, color: chart.foreground, fontSize: 12, boxShadow: "var(--shadow-lg)" }} cursor={{ stroke: chart.accent, strokeOpacity: 0.3 }} labelStyle={{ color: chart.text, marginBottom: 4 }} />
                <Area type="monotone" dataKey="mensagens" stroke={chart.accent} strokeWidth={2.5} fill="url(#dashArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </section>
        </Reveal>

        {/* States donut */}
        <Reveal delay={0.15} className="col-span-12 xl:col-span-4">
          <section className="surface elevate-sm flex h-full flex-col rounded-2xl p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]"><PieIcon className="size-4" /></span>
              <h2 className="font-display text-[0.95rem] font-semibold text-foreground">Estados das conversas</h2>
            </div>
            <div className="relative mx-auto h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={2} strokeWidth={0}>
                    {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: chart.card, border: `1px solid ${chart.border}`, borderRadius: 12, color: chart.foreground, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-semibold tabular text-foreground">{data.totalConversations}</span>
                <span className="text-[0.65rem] text-muted-foreground">conversas</span>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <Legend color={chart.accent} label="Triagem concluída" value={concluidas} />
              <Legend color="var(--muted-foreground)" label="Em andamento" value={andamento} />
              <Legend color="var(--warning)" label="Aguardando humano" value={data.humanModeCount} />
            </div>
          </section>
        </Reveal>

        {/* Today */}
        <Reveal delay={0.1} className="col-span-12 lg:col-span-6 xl:col-span-5">
          <section className="surface elevate-sm h-full rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]"><CalendarClock className="size-4" /></span>
              <h2 className="font-display text-[0.95rem] font-semibold text-foreground">Agenda de hoje</h2>
            </div>
            {todayAppts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem consultas para hoje.</p>
            ) : (
              <div className="space-y-1">
                {todayAppts.map((a, i) => (
                  <div key={a.id} className={cn("flex items-center gap-4 py-2.5", i !== todayAppts.length - 1 && "border-b border-border")}>
                    <span className="font-display w-14 shrink-0 text-base font-semibold tabular text-foreground">{format(new Date(a.scheduledAt), "HH:mm")}</span>
                    <span className="h-8 w-px shrink-0 bg-border" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.patientName}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.service}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* Attention */}
        <Reveal delay={0.15} className="col-span-12 lg:col-span-6 xl:col-span-4">
          <section className="surface elevate-sm flex h-full flex-col rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[0.95rem] font-semibold text-foreground">Precisa de atenção</h2>
              {attention.length > 0 && <StatusPill tone="warning">{attention.length}</StatusPill>}
            </div>
            {attention.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Sparkles className="size-5" /></span>
                <p className="mt-3 text-sm font-medium text-foreground">Tudo em dia</p>
                <p className="text-xs text-muted-foreground">Nenhuma conversa aguardando.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {attention.map((c) => (
                  <button key={c.id} onClick={() => router.push(`/conversas/${c.id}`)} className="focus-ring flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--warning-soft)] text-xs font-semibold text-[var(--warning)]">{getInitials(c.contactName || c.contactPhone)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.contactName || maskPhoneBR(c.contactPhone)}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.messages[0]?.content ?? "—"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* Top services */}
        <Reveal delay={0.2} className="col-span-12 xl:col-span-3">
          <section className="surface elevate-sm h-full rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Sparkles className="size-4" /></span>
              <h2 className="font-display text-[0.95rem] font-semibold text-foreground">Serviços top</h2>
            </div>
            {topServices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <div className="space-y-3">
                {topServices.map(([name, count]) => (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="truncate text-foreground">{name}</span>
                      <span className="font-display font-semibold tabular text-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="bg-brand h-full rounded-full" style={{ width: `${Math.max(8, (count / maxService) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* Recent activity — full width */}
        <Reveal delay={0.15} className="col-span-12">
          <section className="surface elevate-sm rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Clock className="size-4" /></span>
              <h2 className="font-display text-[0.95rem] font-semibold text-foreground">Atividade recente</h2>
            </div>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem atividade ainda.</p>
            ) : (
              <Stagger className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {recent.map((c) => (
                  <StaggerItem key={c.id}>
                    <button onClick={() => router.push(`/conversas/${c.id}`)} className="focus-ring flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">{getInitials(c.contactName || c.contactPhone)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{c.contactName || maskPhoneBR(c.contactPhone)}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.messages[0]?.content ?? "—"}</p>
                      </div>
                      <span className="shrink-0 text-[0.7rem] text-muted-foreground">{format(new Date(c.updatedAt), "HH:mm")}</span>
                    </button>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-display font-semibold tabular text-foreground">{value}</span>
    </div>
  );
}
