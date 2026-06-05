"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string; patientName: string; patientPhone: string;
  service: string; scheduledAt: string; endsAt: string;
  status: string; notes: string | null;
}

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);

  async function load() {
    const data = await api.get<{ appointments: Appointment[]; total: number }>("/panel/appointments");
    setAppointments(data.appointments);
    setTotal(data.total);
  }

  async function cancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    await api.patch(`/panel/appointments/${id}/cancel`, {});
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} agendamentos futuros</p>
      </div>

      <div className="space-y-3">
        {appointments.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">Sem agendamentos futuros</Card>
        )}
        {appointments.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="bg-[var(--aqua-glow)] p-2.5 rounded-lg shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground">{a.patientName}</p>
                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">{a.service}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(a.scheduledAt), "EEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />{a.patientPhone}
                  </span>
                </div>
                {a.notes && <p className="text-xs text-muted-foreground mt-1 italic">{a.notes}</p>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => cancel(a.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
