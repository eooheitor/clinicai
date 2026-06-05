"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Bot, User, RefreshCw, Send, BotOff, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message { id: string; role: string; content: string; createdAt: string; }
interface Conversation {
  id: string; contactPhone: string; contactName: string | null;
  humanMode: boolean; triagemCompleta: boolean; messages: Message[];
}

export default function ConversaDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await api.get<Conversation>(`/panel/conversations/${id}`);
    setConv(data);
  }, [id]);

  async function pausarIA() {
    await api.patch(`/panel/conversations/${id}/pausar-ia`, {});
    toast.success("IA pausada — conversa em modo humano");
    load();
  }

  async function reativarIA() {
    await api.patch(`/panel/conversations/${id}/reativar-ia`, {});
    toast.success("IA reativada com sucesso");
    load();
  }

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/panel/conversations/${id}/send`, { text });
      setText("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  if (!conv) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="flex flex-col h-full max-w-3xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-sidebar flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{conv.contactName || conv.contactPhone}</p>
            {conv.triagemCompleta && (
              <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                <ClipboardCheck className="h-3 w-3" />
                Triagem concluída
              </Badge>
            )}
            {conv.humanMode && (
              <Badge className="bg-orange-400/15 text-orange-400 border-orange-400/30">
                Aguardando atendente
              </Badge>
            )}
          </div>
          {conv.contactName && (
            <p className="text-sm text-muted-foreground">{conv.contactPhone}</p>
          )}
        </div>
        {conv.humanMode ? (
          <Button size="sm" onClick={reativarIA} className="bg-primary hover:bg-primary/90 text-[var(--bg-0)]">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reativar IA
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={pausarIA} className="border-orange-400/40 text-orange-400 hover:bg-orange-400/10">
            <BotOff className="h-3.5 w-3.5 mr-1.5" />
            Pausar IA
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-5 space-y-3 bg-background">
        {conv.messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2.5", msg.role === "assistant" ? "flex-row" : "flex-row-reverse")}>
            <div className={cn(
              "p-1.5 rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-0.5",
              msg.role === "assistant" ? "bg-[var(--aqua-glow)]" : "bg-secondary"
            )}>
              {msg.role === "assistant"
                ? <Bot className="h-3.5 w-3.5 text-primary" />
                : <User className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <div className={cn(
              "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm",
              msg.role === "assistant"
                ? "bg-card rounded-tl-none ring-1 ring-border"
                : "bg-[var(--aqua-glow)] text-foreground rounded-tr-none ring-1 ring-[var(--border-m)]"
            )}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <p className={cn("text-xs mt-1.5 text-muted-foreground")}>
                {format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input — só aparece em humanMode */}
      {conv.humanMode && (
        <div className="border-t border-border bg-sidebar p-4 shrink-0">
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="Responder como atendente..."
              className="resize-none min-h-[60px] max-h-[120px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            <Button
              onClick={send}
              disabled={sending || !text.trim()}
              className="bg-[var(--cta)] hover:bg-[var(--cta-h)] text-[var(--bg-0)] h-10 px-4 shrink-0 shadow-[0_0_16px_var(--cta-glow)]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      )}
    </div>
  );
}
