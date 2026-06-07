"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/skeletons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/field";
import { Stagger, StaggerItem } from "@/components/motion";
import { cn } from "@/lib/utils";
import {
  Building2, Plus, MessageSquare, Calendar, Users, PowerOff, Power, Trash2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Clinic {
  id: string; name: string; slug: string; evolutionInstance: string;
  active: boolean; createdAt: string;
  _count: { conversations: number; appointments: number };
}
interface NewClinic { name: string; slug: string; evolutionInstance: string; }
interface NewUser { name: string; email: string; password: string; }

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

export default function MasterPage() {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClinic, setShowClinic] = useState(false);
  const [showUser, setShowUser] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [nc, setNc] = useState<NewClinic>({ name: "", slug: "", evolutionInstance: "" });
  const [nu, setNu] = useState<NewUser>({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u?.role !== "MASTER") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, []);

  async function load() {
    const data = await api.get<Clinic[]>("/panel/master/clinics");
    setClinics(data);
    setLoading(false);
  }

  const totals = useMemo(
    () => ({
      ativas: clinics.filter((c) => c.active).length,
      conversas: clinics.reduce((s, c) => s + c._count.conversations, 0),
      agendamentos: clinics.reduce((s, c) => s + c._count.appointments, 0),
    }),
    [clinics]
  );

  async function createClinic() {
    if (!nc.name || !nc.slug || !nc.evolutionInstance) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    try {
      await api.post("/panel/master/clinics", nc);
      toast.success("Cliente criado com sucesso");
      setShowClinic(false);
      setNc({ name: "", slug: "", evolutionInstance: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }
  async function toggleActive(clinicId: string, active: boolean) {
    try {
      await api.patch(`/panel/master/clinics/${clinicId}`, { active });
      toast.success(active ? "Cliente ativado" : "Cliente desativado");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/panel/master/clinics/${deleteTarget.id}`);
      toast.success("Cliente excluído");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }
  async function createUser(clinicId: string) {
    if (!nu.name || !nu.email || !nu.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/panel/master/clinics/${clinicId}/users`, nu);
      toast.success("Usuário criado com sucesso");
      setShowUser(null);
      setNu({ name: "", email: "", password: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const userClinic = clinics.find((c) => c.id === showUser);

  return (
    <div className={`${wrap} space-y-6`}>
      <PageHeader title="Clientes" subtitle="Clínicas e empresas atendidas pela plataforma">
        <Button onClick={() => setShowClinic(true)}>
          <Plus className="size-4" /> Novo cliente
        </Button>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Building2} label="Clientes" value={clinics.length} tone="accent" />
        <Stat icon={CheckCircle2} label="Ativas" value={totals.ativas} tone="accent" />
        <Stat icon={MessageSquare} label="Conversas" value={totals.conversas} />
        <Stat icon={Calendar} label="Agendamentos" value={totals.agendamentos} />
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : clinics.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum cliente cadastrado"
          description="Crie o primeiro cliente para começar."
          action={<Button onClick={() => setShowClinic(true)}><Plus className="size-4" /> Novo cliente</Button>}
        />
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clinics.map((c) => (
            <StaggerItem key={c.id}>
              <div className="surface hover-lift overflow-hidden rounded-2xl">
                <div className="bg-brand h-1.5 w-full" />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <Building2 className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-base font-semibold text-foreground">{c.name}</p>
                        {c.active ? <Badge variant="accent">Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{c.evolutionInstance}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="font-display text-xl font-semibold leading-none text-foreground">{c._count.conversations}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="size-3" /> conversas</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="font-display text-xl font-semibold leading-none text-foreground">{c._count.appointments}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="size-3" /> agendamentos</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowUser(c.id); setNu({ name: "", email: "", password: "" }); }}>
                      <Users className="size-3.5" /> Criar usuário
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(c.active ? "text-[var(--warning)] hover:bg-[var(--warning-soft)]" : "text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]")}
                      onClick={() => toggleActive(c.id, !c.active)}
                    >
                      {c.active ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                      {c.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="outline" size="sm" className="ml-auto text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* New clinic dialog */}
      <Dialog open={showClinic} onOpenChange={setShowClinic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>Cadastre uma nova clínica e sua instância do WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="nc-name">
                <Input id="nc-name" placeholder="Ex: Clínica Ana Paula" value={nc.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                    setNc((n) => ({ ...n, name, slug }));
                  }} />
              </Field>
              <Field label="Slug (URL)" htmlFor="nc-slug">
                <Input id="nc-slug" placeholder="clinica-ana-paula" value={nc.slug} onChange={(e) => setNc((n) => ({ ...n, slug: e.target.value }))} className="font-mono" />
              </Field>
            </div>
            <Field label="Instância Evolution API" htmlFor="nc-inst" hint="Deve coincidir com o nome da instância criada no Evolution API.">
              <Input id="nc-inst" placeholder="clinica-ana-paula" value={nc.evolutionInstance} onChange={(e) => setNc((n) => ({ ...n, evolutionInstance: e.target.value }))} className="font-mono" />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={createClinic} disabled={saving}>{saving ? "Criando..." : "Criar cliente"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={showUser !== null} onOpenChange={(o) => !o && setShowUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar usuário</DialogTitle>
            <DialogDescription>{userClinic ? `Novo acesso para ${userClinic.name}.` : "Novo acesso."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Nome" htmlFor="nu-name"><Input id="nu-name" value={nu.name} onChange={(e) => setNu((u) => ({ ...u, name: e.target.value }))} /></Field>
            <Field label="E-mail" htmlFor="nu-email"><Input id="nu-email" type="email" value={nu.email} onChange={(e) => setNu((u) => ({ ...u, email: e.target.value }))} /></Field>
            <Field label="Senha" htmlFor="nu-pass"><Input id="nu-pass" type="password" value={nu.password} onChange={(e) => setNu((u) => ({ ...u, password: e.target.value }))} /></Field>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={() => showUser && createUser(showUser)} disabled={saving}>{saving ? "Criando..." : "Criar usuário"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir ${deleteTarget?.name ?? "cliente"}?`}
        description="Todos os dados associados serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "default" }: { icon: typeof Building2; label: string; value: number; tone?: "default" | "accent" }) {
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
