"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { cn } from "@/lib/utils";
import {
  Building2, DollarSign, CheckCircle2, Clock, MessageSquare, Calendar, AlertTriangle,
} from "lucide-react";
import {
  Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Analytics {
  overview: {
    totalClinics: number;
    activeClinics: number;
    trialClinics: number;
    suspendedClinics: number;
    cancelledClinics: number;
    estimatedMRR: number;
  };
  subscriptionBreakdown: { status: string; count: number }[];
  newClinicsLast30Days: { date: string; count: number }[];
  trialsExpiringSoon: { id: string; name: string; trialEndsAt: string }[];
  recentSignups: { id: string; name: string; subscriptionStatus: string; createdAt: string }[];
  engagement: {
    totalConversations: number;
    conversationsLast7Days: number;
    totalAppointments: number;
    appointmentsLast7Days: number;
  };
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  TRIAL: "Trial",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
};

const STATUS_TONE: Record<string, "accent" | "warning" | "destructive" | "muted"> = {
  ACTIVE: "accent",
  TRIAL: "warning",
  SUSPENDED: "destructive",
  CANCELLED: "muted",
};

const DONUT_COLORS: Record<string, string> = {
  ACTIVE: "var(--accent-strong)",
  TRIAL: "rgb(245,158,11)",
  SUSPENDED: "var(--destructive)",
  CANCELLED: "var(--muted-foreground)",
};

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function MasterAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chart = useChartTheme();

  useEffect(() => {
    const user = getUser();
    if (user?.role !== "MASTER") { router.replace("/dashboard"); return; }
    api.get<Analytics>("/panel/master/analytics")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) {
    return (
      <div className={wrap}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const chartData = data?.newClinicsLast30Days.map((d) => ({
    day: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    count: d.count,
  })) ?? [];

  const donutData = (data?.subscriptionBreakdown ?? []).filter((b) => b.count > 0);
  const totalDonut = donutData.reduce((s, b) => s + b.count, 0);

  return (
    <div className={`${wrap} space-y-6`}>
      <PageHeader title="Analytics do Negócio" subtitle="Visão consolidada da plataforma" />

      {/* KPI row */}
      <Reveal>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 xl:col-span-3">
            <StatCard
              icon={Building2}
              label="Total de clientes"
              value={data?.overview.totalClinics ?? 0}
              hint={`${data?.overview.activeClinics ?? 0} ativos`}
            />
          </div>
          <div className="col-span-12 sm:col-span-6 xl:col-span-3">
            <StatCard
              icon={DollarSign}
              label="MRR estimado"
              value={data?.overview.estimatedMRR ?? 0}
              hint="R$ 79,90 × clientes ativos"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 xl:col-span-3">
            <StatCard
              icon={CheckCircle2}
              label="Clientes ativos"
              value={data?.overview.activeClinics ?? 0}
              hint="Assinatura vigente"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 xl:col-span-3">
            <StatCard
              icon={Clock}
              label="Em trial"
              value={data?.overview.trialClinics ?? 0}
              hint="Período de avaliação"
              tone={data?.overview.trialClinics ? "warning" : "default"}
            />
          </div>
        </div>
      </Reveal>

      {/* Chart + Donut */}
      <div className="grid grid-cols-12 gap-4">
        <Reveal className="col-span-12 xl:col-span-8">
          <SectionCard title="Novos cadastros" description="Últimos 30 dias">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-signups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chart.accent} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={chart.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: chart.text }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: chart.text }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: chart.card, border: `1px solid ${chart.border}`, borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: chart.text }}
                    formatter={(v) => [v, "cadastros"]}
                  />
                  <Area type="monotone" dataKey="count" stroke={chart.accent} strokeWidth={2} fill="url(#grad-signups)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </Reveal>

        <Reveal className="col-span-12 xl:col-span-4">
          <SectionCard title="Clientes por status">
            <div className="flex h-52 items-center justify-center">
              {data && totalDonut > 0 ? (
                <div className="relative flex w-full items-center justify-center gap-6">
                  <PieChart width={140} height={140}>
                    <Pie data={donutData} dataKey="count" nameKey="status" innerRadius={44} outerRadius={66} strokeWidth={0} paddingAngle={3}>
                      {donutData.map((entry) => (
                        <Cell key={entry.status} fill={DONUT_COLORS[entry.status] ?? "#888"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: chart.card, border: `1px solid ${chart.border}`, borderRadius: 10, fontSize: 12 }}
                      formatter={(v, _n, props: any) => [v, STATUS_LABEL[props.payload.status] ?? props.payload.status]}
                    />
                  </PieChart>
                  <div className="flex flex-col gap-2">
                    {donutData.map((b) => (
                      <div key={b.status} className="flex items-center gap-2 text-sm">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[b.status] }} />
                        <span className="text-muted-foreground">{STATUS_LABEL[b.status]}</span>
                        <span className="ml-auto font-semibold tabular-nums">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados</p>
              )}
            </div>
          </SectionCard>
        </Reveal>
      </div>

      {/* Trials expiring + Recent signups */}
      <div className="grid grid-cols-12 gap-4">
        <Reveal className="col-span-12 lg:col-span-5">
          <SectionCard
            title="Trials expirando em breve"
            description="Próximas 72 horas"
            icon={AlertTriangle}
          >
            {data?.trialsExpiringSoon.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum trial expirando</p>
            ) : (
              <Stagger className="divide-y divide-border">
                {(data?.trialsExpiringSoon ?? []).map((clinic) => {
                  const days = daysUntil(clinic.trialEndsAt);
                  return (
                    <StaggerItem key={clinic.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{clinic.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(clinic.trialEndsAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <StatusPill tone={days <= 2 ? "destructive" : "warning"} dot={false}>
                        {days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `${days} dias`}
                      </StatusPill>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </SectionCard>
        </Reveal>

        <Reveal className="col-span-12 lg:col-span-7">
          <SectionCard title="Últimos cadastros">
            <Stagger className="divide-y divide-border">
              {(data?.recentSignups ?? []).map((c) => (
                <StaggerItem key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <StatusPill tone={STATUS_TONE[c.subscriptionStatus] ?? "muted"} dot={false}>
                    {STATUS_LABEL[c.subscriptionStatus] ?? c.subscriptionStatus}
                  </StatusPill>
                </StaggerItem>
              ))}
            </Stagger>
          </SectionCard>
        </Reveal>
      </div>

      {/* Engagement */}
      <div className="grid grid-cols-12 gap-4">
        <Reveal className="col-span-12 sm:col-span-6">
          <StatCard
            icon={MessageSquare}
            label="Total de conversas"
            value={data?.engagement.totalConversations ?? 0}
            hint={`+${data?.engagement.conversationsLast7Days ?? 0} nos últimos 7 dias`}
          />
        </Reveal>
        <Reveal className="col-span-12 sm:col-span-6">
          <StatCard
            icon={Calendar}
            label="Total de agendamentos"
            value={data?.engagement.totalAppointments ?? 0}
            hint={`+${data?.engagement.appointmentsLast7Days ?? 0} nos últimos 7 dias`}
          />
        </Reveal>
      </div>
    </div>
  );
}
