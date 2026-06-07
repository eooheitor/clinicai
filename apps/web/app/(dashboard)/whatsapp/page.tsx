"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Reveal } from "@/components/motion";
import {
  Smartphone, RefreshCw, CheckCircle2, Loader2, QrCode, ShieldCheck,
  Sparkles, CalendarCheck, Clock, MessageSquare, Activity, Hash,
} from "lucide-react";
import { toast } from "sonner";

interface StatusResponse { state: string; instanceName: string; }
interface QrResponse { qrcode: string; }
interface DashData { activeToday: number; totalConversations: number; }

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

const benefits = [
  { icon: Sparkles, title: "Atendente 24/7", text: "Responde e qualifica sozinha, a qualquer hora do dia." },
  { icon: CalendarCheck, title: "Agenda sozinha", text: "Marca consultas direto na sua agenda, sem você tocar." },
  { icon: Clock, title: "Lembretes", text: "Avisa o cliente 24h antes para reduzir faltas." },
];

export default function WhatsAppPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [polling, setPolling] = useState(false);
  const [dash, setDash] = useState<DashData | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<StatusResponse>("/panel/whatsapp/status");
      setStatus(data);
      return data.state;
    } catch {
      return null;
    }
  }, []);

  const fetchQr = useCallback(async () => {
    setLoadingQr(true);
    setQr(null);
    try {
      const data = await api.get<QrResponse>("/panel/whatsapp/qrcode");
      if (!data.qrcode) {
        toast.error("QR Code não disponível. Tente novamente.");
        return;
      }
      setQr(data.qrcode);
      setPolling(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar QR Code");
    } finally {
      setLoadingQr(false);
    }
  }, []);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const state = await fetchStatus();
      if (state === "open") {
        setPolling(false);
        setQr(null);
        toast.success("WhatsApp conectado!");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, fetchStatus]);

  useEffect(() => {
    fetchStatus();
    api.get<DashData>("/panel/dashboard").then(setDash).catch(() => {});
  }, [fetchStatus]);

  const isConnected = status?.state === "open";
  const isConnecting = status?.state === "connecting" || polling;

  return (
    <div className={`${wrap} space-y-4`}>
      <PageHeader title="WhatsApp" subtitle="Conecte o número que a sua IA vai atender">
        <Button variant="outline" size="sm" onClick={fetchStatus}><RefreshCw className="size-3.5" /> Atualizar</Button>
      </PageHeader>

      <div className="grid grid-cols-12 gap-4">
        {/* Connection hero */}
        <Reveal className="col-span-12 xl:col-span-8">
          <div className="bg-aurora surface relative h-full overflow-hidden rounded-3xl">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
              <div className="flex justify-center">
                {isConnected ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <span className="bg-brand relative flex size-28 items-center justify-center rounded-full text-white shadow-[0_10px_40px_var(--accent-glow)]">
                      <CheckCircle2 className="size-14" />
                      <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent-strong)] opacity-20" />
                    </span>
                    <p className="font-display text-2xl font-semibold text-foreground">Conectado</p>
                  </div>
                ) : (
                  <DeviceFrame>
                    {qr ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR Code do WhatsApp" className="size-full rounded-xl object-contain" />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <QrCode className="size-14 opacity-25" />
                        <span className="text-xs">Gere o código para conectar</span>
                      </div>
                    )}
                  </DeviceFrame>
                )}
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-xl ${isConnected ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-muted text-muted-foreground"}`}>
                    <Smartphone className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Status da conexão</p>
                    <div className="mt-1">
                      {isConnected ? <StatusPill tone="accent">Conectado</StatusPill> : isConnecting ? <StatusPill tone="warning" pulse>Aguardando leitura…</StatusPill> : <StatusPill tone="destructive">Desconectado</StatusPill>}
                    </div>
                  </div>
                </div>

                {isConnected ? (
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                    <ShieldCheck className="size-4" /> Conexão segura e criptografada. Sua IA está atendendo agora.
                  </div>
                ) : (
                  <>
                    <ol className="space-y-3">
                      {["Abra o WhatsApp no seu celular", "Toque em Aparelhos conectados", "Toque em Conectar aparelho e aponte para o código"].map((step, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                          <span className="bg-brand flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <Button onClick={fetchQr} disabled={loadingQr} size="lg" className="w-full sm:w-auto">
                      {loadingQr ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                      {qr ? "Gerar novo código" : "Gerar QR Code"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Side: details + stats */}
        <Reveal delay={0.08} className="col-span-12 xl:col-span-4">
          <div className="flex h-full flex-col gap-4">
            <div className="surface rounded-2xl p-5">
              <h2 className="font-display text-[0.95rem] font-semibold text-foreground">Detalhes da conexão</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Row icon={Activity} label="Estado">
                  {isConnected ? <span className="text-[var(--accent-strong)]">Ativo</span> : isConnecting ? <span className="text-[var(--warning)]">Conectando</span> : <span className="text-destructive">Inativo</span>}
                </Row>
                <Row icon={Hash} label="Instância">
                  <span className="font-mono text-xs">{status?.instanceName ?? "—"}</span>
                </Row>
              </dl>
            </div>

            <div className="surface grid grid-cols-2 gap-3 rounded-2xl p-5">
              <div>
                <p className="font-display text-2xl font-semibold leading-none text-foreground">{dash?.activeToday ?? 0}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="size-3" /> conversas hoje</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold leading-none text-foreground">{dash?.totalConversations ?? 0}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="size-3" /> no total</p>
              </div>
            </div>

            <div className="surface flex-1 rounded-2xl p-5">
              <p className="text-sm font-medium text-foreground">Precisa de ajuda?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use um número que ainda não esteja conectado ao WhatsApp Web em outro lugar. A conexão fica ativa mesmo com o celular offline.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Benefits */}
        {benefits.map((b, i) => (
          <Reveal key={b.title} delay={0.1 + i * 0.05} className="col-span-12 sm:col-span-4">
            <div className="surface hover-lift h-full rounded-2xl p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]"><b.icon className="size-5" /></span>
              <p className="mt-4 font-display text-base font-semibold text-foreground">{b.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Activity; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /> {label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  );
}

function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[240px] rounded-[2.25rem] border-[10px] border-foreground/10 bg-card p-3 elevate-lg">
      <div className="absolute left-1/2 top-2.5 h-1.5 w-14 -translate-x-1/2 rounded-full bg-foreground/15" />
      <div className="mt-3 flex aspect-square items-center justify-center rounded-2xl bg-white p-3">{children}</div>
      <div className="mt-3 flex items-center justify-center gap-1.5 pb-1 text-[0.7rem] text-muted-foreground">
        <MessageSquare className="size-3 text-[var(--accent-strong)]" /> ClinicAI · WhatsApp
      </div>
    </div>
  );
}
