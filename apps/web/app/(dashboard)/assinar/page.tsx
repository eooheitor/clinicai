"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion";
import {
  Check, Loader2, MessageSquare, Calendar, Bot, Smartphone, Zap, ShieldCheck, Sparkles, Clock, Infinity as InfinityIcon,
} from "lucide-react";

const features = [
  { icon: Bot, label: "Atendente IA 24/7 no WhatsApp" },
  { icon: Calendar, label: "Agendamentos automáticos" },
  { icon: InfinityIcon, label: "Conversas ilimitadas" },
  { icon: Smartphone, label: "Instância dedicada do WhatsApp" },
  { icon: Zap, label: "Integração com Google Calendar" },
  { icon: Clock, label: "Lembretes automáticos de consulta" },
];

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

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
    <div className={`${wrap} space-y-6`}>
      <Reveal>
        <div className="bg-aurora surface relative overflow-hidden rounded-3xl">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            {/* Left: pitch */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-strong)]">
                <Sparkles className="size-3" /> Plano Profissional
              </span>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-foreground">
                Continue atendendo no <span className="text-gradient italic">piloto automático</span>.
              </h2>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Mantenha sua IA respondendo, qualificando e agendando sem interrupções após o período de teste.
              </p>

              <ul className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {features.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <Icon className="size-3.5" />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: price card */}
            <div className="surface elevate-lg rounded-2xl p-7">
              <div className="text-center">
                <div className="flex items-end justify-center gap-1.5">
                  <span className="font-display text-5xl font-semibold tracking-[-0.03em] text-foreground">R$79,90</span>
                  <span className="mb-2 text-muted-foreground">/mês</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Cartão, PIX ou boleto — sem precisar de conta no Mercado Pago</p>
              </div>

              {error && (
                <p className="mt-5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}

              <Button onClick={handleSubscribe} disabled={loading} size="lg" className="mt-6 w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {loading ? "Aguarde..." : "Assinar agora"}
              </Button>

              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center justify-center gap-1.5"><ShieldCheck className="size-3.5 text-[var(--accent-strong)]" /> Pagamento 100% seguro via Mercado Pago</p>
                <p className="text-center">Cancele quando quiser, sem multa.</p>
              </div>

              {user?.clinic && (
                <p className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
                  Assinatura para <span className="font-medium text-foreground">{user.clinic.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
