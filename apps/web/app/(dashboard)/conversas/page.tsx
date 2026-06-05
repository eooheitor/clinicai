"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Search, UserX, Clock, ClipboardCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  contactPhone: string;
  contactName: string | null;
  humanMode: boolean;
  triagemCompleta: boolean;
  updatedAt: string;
  messages: { content: string; role: string }[];
  _count: { messages: number };
}

export default function ConversasPage() {
  const router = useRouter();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [humanOnly, setHumanOnly] = useState(false);
  const [triagemOnly, setTriagemOnly] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (humanOnly) params.set("humanMode", "true");
    if (triagemOnly) params.set("triagemCompleta", "true");
    const data = await api.get<{ conversations: Conversation[]; total: number }>(
      `/panel/conversations?${params}`
    );
    setConvs(data.conversations);
    setTotal(data.total);
  }

  useEffect(() => { load(); }, [search, humanOnly, triagemOnly]);

  function toggleHuman() {
    setHumanOnly(!humanOnly);
    setTriagemOnly(false);
  }

  function toggleTriagem() {
    setTriagemOnly(!triagemOnly);
    setHumanOnly(false);
  }

  return (
    <div className="p-8 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} conversas no total</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={triagemOnly ? "default" : "outline"}
            size="sm"
            className={triagemOnly ? "bg-primary hover:bg-primary/90 text-[var(--bg-0)]" : ""}
            onClick={toggleTriagem}
          >
            <ClipboardCheck className="h-4 w-4 mr-1.5" />
            Triagem concluída
          </Button>
          <Button
            variant={humanOnly ? "default" : "outline"}
            size="sm"
            className={humanOnly ? "bg-orange-500 hover:bg-orange-400 text-white" : ""}
            onClick={toggleHuman}
          >
            <UserX className="h-4 w-4 mr-1.5" />
            Aguardando humano
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {convs.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhuma conversa encontrada
          </Card>
        )}
        {convs.map((c) => {
          const last = c.messages[0];
          return (
            <Card
              key={c.id}
              className="p-4 cursor-pointer hover:border-[var(--border-m)] transition-colors"
              onClick={() => router.push(`/conversas/${c.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="bg-[var(--aqua-glow)] rounded-full p-2.5 mt-0.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-medium text-sm text-foreground">
                      {c.contactName || c.contactPhone}
                    </p>
                    {c.triagemCompleta && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">
                        Triagem concluída
                      </Badge>
                    )}
                    {c.humanMode && (
                      <Badge className="bg-orange-400/15 text-orange-400 border-orange-400/30 text-xs">
                        Aguardando atendente
                      </Badge>
                    )}
                  </div>
                  {c.contactName && (
                    <p className="text-xs text-muted-foreground">{c.contactPhone}</p>
                  )}
                  {last && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {last.role === "assistant" ? "Ana: " : ""}{last.content}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(c.updatedAt), { locale: ptBR, addSuffix: true })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{c._count.messages} msgs</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
