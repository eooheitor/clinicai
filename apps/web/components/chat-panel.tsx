"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/status-pill";
import { ArrowLeft, Bot, User, RefreshCw, Send, BotOff, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "motion/react";
import { cn, getInitials, maskPhoneBR } from "@/lib/utils";
import { toast } from "sonner";

interface Message { id: string; role: string; content: string; createdAt: string; }
interface Conversation {
  id: string; contactPhone: string; contactName: string | null;
  humanMode: boolean; triagemCompleta: boolean; messages: Message[];
}

export function ChatPanel({
  conversationId,
  onBack,
  className,
}: {
  conversationId: string;
  onBack?: () => void;
  className?: string;
}) {
  const [conv, setConv] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await api.get<Conversation>(`/panel/conversations/${conversationId}`);
    setConv(data);
  }, [conversationId]);

  async function pausarIA() {
    await api.patch(`/panel/conversations/${conversationId}/pausar-ia`, {});
    toast.success("IA pausada — conversa em modo humano");
    load();
  }
  async function reativarIA() {
    await api.patch(`/panel/conversations/${conversationId}/reativar-ia`, {});
    toast.success("IA reativada com sucesso");
    load();
  }
  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/panel/conversations/${conversationId}/send`, { text });
      setText("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    setConv(null);
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length]);

  if (!conv) {
    return (
      <div className={cn("flex h-full items-center justify-center text-sm text-muted-foreground", className)}>
        Carregando conversa…
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <header className="glass flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Voltar" className="md:hidden">
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
          {getInitials(conv.contactName || conv.contactPhone)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground">{conv.contactName || maskPhoneBR(conv.contactPhone)}</p>
            {conv.triagemCompleta && <StatusPill tone="accent" dot={false}>Triagem</StatusPill>}
            {conv.humanMode && <StatusPill tone="warning" pulse>Humano</StatusPill>}
          </div>
          <p className="truncate text-xs text-muted-foreground">{maskPhoneBR(conv.contactPhone)}</p>
        </div>
        {conv.humanMode ? (
          <Button size="sm" onClick={reativarIA}>
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Reativar IA</span>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={pausarIA}>
            <BotOff className="size-3.5" />
            <span className="hidden sm:inline">Pausar IA</span>
          </Button>
        )}
      </header>

      {/* Messages */}
      <div className="chat-bg flex-1 space-y-3 overflow-auto px-4 py-6 sm:px-8 lg:px-16">
        {conv.messages.map((msg) => {
          const isAI = msg.role === "assistant";
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={cn("flex items-end gap-2", isAI ? "flex-row" : "flex-row-reverse")}
            >
              <span
                className={cn(
                  "mb-5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  isAI ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-muted text-muted-foreground"
                )}
              >
                {isAI ? <Bot className="size-3" /> : <User className="size-3" />}
              </span>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm elevate-sm",
                  isAI
                    ? "rounded-bl-sm border border-border bg-card text-foreground"
                    : "rounded-br-sm bg-[color-mix(in_srgb,var(--accent-strong)_18%,var(--card))] text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={cn("mt-1 text-[0.65rem] text-muted-foreground", isAI ? "text-left" : "text-right")}>
                  {format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer / status */}
      {conv.humanMode ? (
        <div className="glass shrink-0 border-t border-border p-3 sm:px-6">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Responder como atendente…"
              className="max-h-[120px] min-h-[44px] resize-none bg-card"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={sending || !text.trim()} size="icon-lg" className="shrink-0" aria-label="Enviar">
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      ) : (
        <div className="glass flex shrink-0 items-center justify-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-[var(--accent-strong)]" />
          IA respondendo automaticamente — pause para assumir a conversa.
        </div>
      )}
    </div>
  );
}
