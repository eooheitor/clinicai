"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/skeletons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/field";
import { Stagger, StaggerItem } from "@/components/motion";
import { cn, getInitials } from "@/lib/utils";
import {
  Search, Building2, Trash2, PowerOff, Power, KeyRound, X, Check, Users, ShieldCheck, CircleCheck, CircleOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface User {
  id: string; name: string; email: string;
  role: "MASTER" | "CLINIC"; active: boolean; createdAt: string;
  clinic: { id: string; name: string; slug: string } | null;
}
type Filter = "todos" | "master" | "ativos" | "inativos" | string;

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [changingPassword, setChangingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const me = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => {
    const u = getUser();
    if (u?.role !== "MASTER") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, []);

  async function load() {
    const data = await api.get<User[]>("/panel/master/users");
    setUsers(data);
    setLoading(false);
  }

  const clinics = Array.from(new Map(users.filter((u) => u.clinic).map((u) => [u.clinic!.id, u.clinic!])).values());

  const counts = useMemo(
    () => ({
      total: users.length,
      master: users.filter((u) => u.role === "MASTER").length,
      ativos: users.filter((u) => u.active).length,
      inativos: users.filter((u) => !u.active).length,
    }),
    [users]
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
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/panel/master/users/${deleteTarget.id}`);
      toast.success("Usuário excluído");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
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

  const chips: { value: Filter; label: string; count?: number }[] = [
    { value: "todos", label: "Todos", count: counts.total },
    { value: "master", label: "Masters", count: counts.master },
    { value: "ativos", label: "Ativos", count: counts.ativos },
    { value: "inativos", label: "Inativos", count: counts.inativos },
    ...clinics.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className={`${wrap} space-y-6`}>
      <PageHeader title="Usuários" subtitle="Gerencie quem acessa o painel" />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Total" value={counts.total} />
        <Stat icon={ShieldCheck} label="Masters" value={counts.master} tone="accent" />
        <Stat icon={CircleCheck} label="Ativos" value={counts.ativos} tone="accent" />
        <Stat icon={CircleOff} label="Inativos" value={counts.inativos} tone="muted" />
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={cn(
              "focus-ring flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filter === c.value
                ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {clinics.some((cl) => cl.id === c.value) && <Building2 className="size-3.5" />}
            {c.label}
            {c.count !== undefined && (
              <span className={cn("text-xs", filter === c.value ? "opacity-80" : "text-muted-foreground/70")}>
                {c.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou e-mail…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros." />
      ) : (
        <Stagger className="space-y-2.5">
          {filtered.map((u) => (
            <StaggerItem key={u.id}>
              <div className={cn("surface rounded-xl p-4", !u.active && "opacity-60")}>
                <div className="flex items-center gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
                    {getInitials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{u.name}</p>
                      {u.role === "MASTER" && <Badge variant="accent">Master</Badge>}
                      {!u.active && <Badge variant="outline">Inativo</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                    {u.clinic && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="size-3" /> {u.clinic.name}
                      </p>
                    )}
                  </div>
                  <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {formatDistanceToNow(new Date(u.createdAt), { locale: ptBR, addSuffix: true })}
                  </p>
                  {u.id !== me?.id && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={u.active ? "Desativar" : "Ativar"}
                        className={cn(u.active ? "text-[var(--warning)] hover:bg-[var(--warning-soft)]" : "text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]")}
                        onClick={() => toggleActive(u.id, !u.active)}
                      >
                        {u.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Alterar senha" className="text-muted-foreground hover:text-foreground" onClick={() => { setChangingPassword(u.id); setNewPassword(""); }}>
                        <KeyRound className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Excluir usuário" className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(u)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {changingPassword === u.id && (
                  <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
                    <Field label="Nova senha" htmlFor={`pw-${u.id}`} className="flex-1">
                      <Input id={`pw-${u.id}`} type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePassword(u.id)} autoFocus />
                    </Field>
                    <Button size="icon" onClick={() => savePassword(u.id)} disabled={saving} aria-label="Salvar senha"><Check className="size-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => setChangingPassword(null)} aria-label="Cancelar"><X className="size-4" /></Button>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir ${deleteTarget?.name ?? "usuário"}?`}
        description="Esta ação é permanente e não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "default" }: { icon: typeof Users; label: string; value: number; tone?: "default" | "accent" | "muted" }) {
  return (
    <div className="surface flex items-center gap-3 rounded-2xl px-4 py-3.5">
      <span className={cn("flex size-10 items-center justify-center rounded-xl", tone === "accent" ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-muted text-muted-foreground")}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-display text-xl font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
