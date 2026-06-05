"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, RefreshCw, CheckCircle, XCircle, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";

interface StatusResponse {
  state: string;
  instanceName: string;
}

interface QrResponse {
  qrcode: string;
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [polling, setPolling] = useState(false);

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
      if (!data.qrcode) { toast.error("QR Code não disponível. Tente novamente."); return; }
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
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const isConnected = status?.state === "open";
  const isConnecting = status?.state === "connecting" || polling;

  return (
    <div className="p-8 space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie a conexão do seu número</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isConnected ? "bg-[var(--aqua-glow)]" : "bg-secondary"}`}>
              <Smartphone className={`h-6 w-6 ${isConnected ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Status da conexão</p>
              <div className="flex items-center gap-2 mt-1">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <Badge className="bg-primary/15 text-primary border-primary/30">Conectado</Badge>
                  </>
                ) : isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
                    <Badge className="bg-yellow-400/15 text-yellow-400 border-yellow-400/30">Aguardando leitura...</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive/70" />
                    <Badge className="bg-destructive/10 text-destructive/80 border-destructive/20">Desconectado</Badge>
                  </>
                )}
              </div>
              {status?.instanceName && (
                <p className="text-xs text-muted-foreground mt-1">Instância: {status.instanceName}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      {!isConnected && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-muted-foreground" />
              <p className="font-medium text-foreground">Conectar via QR Code</p>
            </div>

            {qr ? (
              <div className="flex flex-col items-center gap-3">
                <div className="border-2 border-[var(--border-m)] rounded-xl p-3 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
                </p>
                <Button variant="outline" size="sm" onClick={fetchQr} disabled={loadingQr}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Gerar novo QR
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="bg-secondary rounded-xl w-56 h-56 flex items-center justify-center text-muted-foreground">
                  <QrCode className="h-16 w-16 opacity-20" />
                </div>
                <Button
                  onClick={fetchQr}
                  disabled={loadingQr}
                  className="bg-[var(--cta)] hover:bg-[var(--cta-h)] text-[var(--bg-0)] shadow-[0_0_20px_var(--cta-glow)]"
                >
                  {loadingQr ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>
                  ) : (
                    <><QrCode className="h-4 w-4 mr-2" />Gerar QR Code</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isConnected && (
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <CheckCircle className="h-10 w-10 text-primary mx-auto" />
            <p className="font-medium text-foreground">WhatsApp conectado com sucesso</p>
            <p className="text-sm text-muted-foreground">
              Sua IA está ativa e respondendo mensagens automaticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
