"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/segmented";
import { ChatPanel } from "@/components/chat-panel";
import { StatusPill } from "@/components/status-pill";
import { ListSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { Search, MessageSquare, MessagesSquare } from "lucide-react";
import { cn, getInitials, maskPhoneBR } from "@/lib/utils";
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

type Filter = "all" | "triagem" | "humano";

export function Inbox({ initialId }: { initialId?: string }) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | undefined>(initialId);
  const isMobile = useIsMobile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (filter === "humano") params.set("humanMode", "true");
    if (filter === "triagem") params.set("triagemCompleta", "true");
    try {
      const data = await api.get<{ conversations: Conversation[]; total: number }>(
        `/panel/conversations?${params}`
      );
      setConvs(data.conversations);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 12_000);
    return () => clearInterval(t);
  }, [load]);

  function select(id: string) {
    setSelected(id);
    window.history.replaceState(null, "", `/conversas/${id}`);
  }
  function deselect() {
    setSelected(undefined);
    window.history.replaceState(null, "", "/conversas");
  }

  // humanMode conversations float to the top
  const ordered = [...convs].sort(
    (a, b) => Number(b.humanMode) - Number(a.humanMode) || +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );

  const list = (
    <aside className="flex h-full w-full flex-col border-border md:w-[360px] md:shrink-0 md:border-r lg:w-[400px]">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-foreground">Conversas</h1>
          <span className="text-xs text-muted-foreground">{total}</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa…"
            className="h-9 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Segmented
          idBase="inbox"
          value={filter}
          onChange={setFilter}
          className="w-full"
          options={[
            { value: "all", label: "Todas" },
            { value: "triagem", label: "Triagem" },
            { value: "humano", label: "Humano" },
          ]}
        />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-2">
        {loading ? (
          <ListSkeleton rows={7} className="p-1" />
        ) : ordered.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Nenhuma conversa" description="Tente outro filtro ou busca." className="border-0" />
        ) : (
          ordered.map((c) => {
            const last = c.messages[0];
            const active = c.id === selected;
            return (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className={cn(
                  "focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  active ? "bg-[var(--accent-soft)]" : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "relative flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    c.humanMode
                      ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                      : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  )}
                >
                  {getInitials(c.contactName || c.contactPhone)}
                  {c.humanMode && (
                    <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-card bg-[var(--warning)]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.contactName || maskPhoneBR(c.contactPhone)}
                    </p>
                    <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.updatedAt), { locale: ptBR, addSuffix: false })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {last ? `${last.role === "assistant" ? "IA: " : ""}${last.content}` : "Sem mensagens"}
                    </p>
                    {c.triagemCompleta && !c.humanMode && (
                      <span className="size-1.5 shrink-0 rounded-full bg-[var(--accent-strong)]" />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );

  const empty = (
    <div className="chat-bg hidden h-full flex-1 flex-col items-center justify-center gap-3 text-center md:flex">
      <span className="bg-brand flex size-16 items-center justify-center rounded-3xl text-white shadow-[0_8px_30px_var(--accent-glow)]">
        <MessagesSquare className="size-8" />
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">Sua central de atendimento</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Selecione uma conversa à esquerda para ver as mensagens e assumir quando precisar.
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-full">
        {selected ? <ChatPanel conversationId={selected} onBack={deselect} /> : list}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {list}
      {selected ? <ChatPanel key={selected} conversationId={selected} className="flex-1" /> : empty}
    </div>
  );
}
