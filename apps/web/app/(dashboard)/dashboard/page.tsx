"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar, Users, AlertCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashData {
  totalConversations: number;
  activeToday: number;
  humanModeCount: number;
  appointmentsToday: number;
  appointmentsWeek: number;
  totalPatients: number;
  messagesLast7Days: { day: string; count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<DashData>("/panel/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="p-8 text-destructive">Erro ao carregar dashboard: {error}</div>;
  if (!data) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const stats = [
    {
      label: "Conversas hoje",
      value: data.activeToday,
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-[var(--aqua-glow)]",
    },
    {
      label: "Agendamentos hoje",
      value: data.appointmentsToday,
      icon: Calendar,
      color: "text-[var(--aqua-dim)]",
      bg: "bg-[var(--aqua-glow)]",
    },
    {
      label: "Aguardando humano",
      value: data.humanModeCount,
      icon: AlertCircle,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      badge: data.humanModeCount > 0,
    },
    {
      label: "Total de clientes",
      value: data.totalPatients,
      icon: Users,
      color: "text-primary",
      bg: "bg-[var(--aqua-glow)]",
    },
  ];

  const chartData = data.messagesLast7Days.map((d) => ({
    day: format(new Date(d.day), "EEE", { locale: ptBR }),
    mensagens: d.count,
  }));

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Visão geral do seu atendimento</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`${s.bg} p-2 rounded-lg`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                {s.badge && (
                  <Badge className="bg-orange-400/15 text-orange-400 border-orange-400/30 text-xs">
                    {s.value}
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Mensagens recebidas — últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,210,.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94b4b2" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94b4b2" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#0f1a28",
                  border: "1px solid rgba(0,210,210,.22)",
                  borderRadius: "8px",
                  color: "#e8f4f3",
                  fontSize: 12,
                }}
                cursor={{ fill: "rgba(0,210,200,.06)" }}
              />
              <Bar dataKey="mensagens" fill="#00d2c8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Semana */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Agendamentos essa semana</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{data.appointmentsWeek}</p>
          </div>
          <Calendar className="h-12 w-12 text-[var(--aqua-glow)] opacity-60" style={{ color: "var(--aqua-dim)" }} />
        </CardContent>
      </Card>
    </div>
  );
}
