"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, MessageSquare, Calendar, Bot, Smartphone, Zap } from "lucide-react";

const features = [
  { icon: Bot,           label: "Atendente IA 24/7 no WhatsApp" },
  { icon: Calendar,      label: "Agendamentos automáticos" },
  { icon: MessageSquare, label: "Conversas ilimitadas" },
  { icon: Smartphone,    label: "Instância WhatsApp dedicada" },
  { icon: Zap,           label: "Integração com Google Calendar" },
];

export default function AssinarPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const user = getUser();

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ url: string }>("/panel/subscription/checkout", {});
      window.location.href = res.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Assinar ClinicAI</h1>
        <p className="text-muted-foreground mt-1">Continue usando sem interrupções após o trial</p>
      </div>

      <Card className="border-[var(--border-m)] shadow-[0_0_40px_rgba(0,210,200,.08)]">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-end gap-1 mb-1">
              <span className="text-5xl font-bold text-foreground">R$150</span>
              <span className="text-muted-foreground mb-2">/mês</span>
            </div>
            <p className="text-sm text-muted-foreground">Cartão, PIX ou boleto — sem precisar de conta Mercado Pago</p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                {label}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg mb-4">
              {error}
            </p>
          )}

          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-[var(--cta)] hover:bg-[var(--cta-h)] text-[var(--bg-0)] font-semibold shadow-[0_0_24px_var(--cta-glow)] transition-all h-12 text-base"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Aguarde...</>
            ) : (
              "Pagar com Mercado Pago"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            Cancele quando quiser. Pagamento 100% seguro via Mercado Pago.
          </p>
        </CardContent>
      </Card>

      {user?.clinic && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Assinatura para: <span className="text-foreground font-medium">{user.clinic.name}</span>
        </p>
      )}
    </div>
  );
}
