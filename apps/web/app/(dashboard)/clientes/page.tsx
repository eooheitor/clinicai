"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Phone, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Patient {
  id: string; contactPhone: string; contactName: string | null;
  updatedAt: string; _count: { messages: number };
}

export default function ClientesPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    api.get<{ patients: Patient[]; total: number }>(`/panel/patients?${params}`)
      .then((d) => { setPatients(d.patients); setTotal(d.total); });
  }, [search]);

  return (
    <div className="p-8 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} clientes cadastrados</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou telefone..." className="pl-9"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {patients.map((p) => (
          <Card key={p.id}
            className="p-4 cursor-pointer hover:border-[var(--border-m)] transition-colors"
            onClick={() => router.push(`/conversas/${p.id}`)}
          >
            <div className="flex items-center gap-4">
              <div className="bg-[var(--aqua-glow)] text-primary rounded-full h-10 w-10 flex items-center justify-center font-semibold text-sm shrink-0 ring-1 ring-primary/30">
                {(p.contactName || p.contactPhone).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{p.contactName || p.contactPhone}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />{p.contactPhone}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />{p._count.messages} mensagens
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(p.updatedAt), { locale: ptBR, addSuffix: true })}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
