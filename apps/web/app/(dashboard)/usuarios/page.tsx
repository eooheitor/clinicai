"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserCircle, Building2, Trash2, PowerOff, Power, KeyRound, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "MASTER" | "CLINIC";
  active: boolean;
  createdAt: string;
  clinic: { id: string; name: string; slug: string } | null;
}

type Filter = "todos" | "master" | "ativos" | "inativos" | string;

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [changingPassword, setChangingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const me = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => {
    const u = getUser();
    if (u?.role !== "MASTER") { router.replace("/dashboard"); return; }
    load();
  }, []);

  async function load() {
    const data = await api.get<User[]>("/panel/master/users");
    setUsers(data);
  }

  const clinics = Array.from(
    new Map(
      users.filter((u) => u.clinic).map((u) => [u.clinic!.id, u.clinic!])
    ).values()
  );

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "todos" ||
      (filter === "master" && u.role === "MASTER") ||
      (filter === "ativos" && u.active) ||
      (filter === "inativos" && !u.active) ||
      u.clinic?.id === filter;

    return matchSearch && matchFilter;
  });

  async function toggleActive(userId: string, active: boolean) {
    try {
      await api.patch(`/panel/master/users/${userId}`, { active });
      toast.success(active ? "Usuário ativado" : "Usuário desativado");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Excluir "${name}" permanentemente? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/panel/master/users/${userId}`);
      toast.success("Usuário excluído");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function savePassword(userId: string) {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/panel/master/users/${userId}`, { newPassword });
      toast.success("Senha alterada com sucesso");
      setChangingPassword(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{users.length} usuários cadastrados</p>
      </div>

      <div className="flex gap-6">
        <aside className="w-48 shrink-0 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">Filtrar por</p>
          <FilterBtn active={filter === "todos"} onClick={() => setFilter("todos")}>Todos</FilterBtn>
          <FilterBtn active={filter === "master"} onClick={() => setFilter("master")}>
            <span className="flex items-center gap-1.5"><UserCircle className="h-3.5 w-3.5" /> Admins master</span>
          </FilterBtn>
          <FilterBtn active={filter === "ativos"} onClick={() => setFilter("ativos")}>Ativos</FilterBtn>
          <FilterBtn active={filter === "inativos"} onClick={() => setFilter("inativos")}>Inativos</FilterBtn>

          {clinics.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 pt-3 mb-2">Por cliente</p>
              {clinics.map((c) => (
                <FilterBtn key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
                  <span className="flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </span>
                </FilterBtn>
              ))}
            </>
          )}
        </aside>

        <div className="flex-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</Card>
          )}

          {filtered.map((u) => (
            <Card key={u.id} className={!u.active ? "opacity-50" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="bg-[var(--aqua-glow)] text-primary rounded-full h-10 w-10 flex items-center justify-center font-semibold text-sm shrink-0">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{u.name}</p>
                      {u.role === "MASTER" && (
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary">Master</Badge>
                      )}
                      {!u.active && (
                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.clinic && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {u.clinic.name}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {formatDistanceToNow(new Date(u.createdAt), { locale: ptBR, addSuffix: true })}
                  </p>

                  {u.id !== me?.id && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        title={u.active ? "Desativar" : "Ativar"}
                        className={u.active
                          ? "text-orange-400 hover:text-orange-300 hover:bg-orange-400/10"
                          : "text-primary hover:text-primary/80 hover:bg-[var(--aqua-glow)]"}
                        onClick={() => toggleActive(u.id, !u.active)}
                      >
                        {u.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        title="Alterar senha"
                        className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                        onClick={() => { setChangingPassword(u.id); setNewPassword(""); }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        title="Excluir usuário"
                        className="text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteUser(u.id, u.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {changingPassword === u.id && (
                  <div className="flex items-end gap-2 pt-1 border-t border-border">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Nova senha</Label>
                      <Input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && savePassword(u.id)}
                        autoFocus
                      />
                    </div>
                    <Button size="sm" onClick={() => savePassword(u.id)} disabled={saving}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setChangingPassword(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
        active
          ? "bg-[var(--aqua-glow)] text-primary font-medium shadow-[inset_3px_0_0_var(--aqua)]"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
