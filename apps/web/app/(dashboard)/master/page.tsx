"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MessageSquare, Calendar, Users, X, PowerOff, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Clinic {
  id: string; name: string; slug: string; evolutionInstance: string;
  active: boolean; createdAt: string;
  _count: { conversations: number; appointments: number };
}

interface NewClinic { name: string; slug: string; evolutionInstance: string; }
interface NewUser { name: string; email: string; password: string; }

export default function MasterPage() {
  const router = useRouter();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [showClinic, setShowClinic] = useState(false);
  const [showUser, setShowUser] = useState<string | null>(null);
  const [nc, setNc] = useState<NewClinic>({ name: "", slug: "", evolutionInstance: "" });
  const [nu, setNu] = useState<NewUser>({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u?.role !== "MASTER") { router.replace("/dashboard"); return; }
    load();
  }, []);

  async function load() {
    const data = await api.get<Clinic[]>("/panel/master/clinics");
    setClinics(data);
  }

  async function createClinic() {
    if (!nc.name || !nc.slug || !nc.evolutionInstance) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSaving(true);
    try {
      await api.post("/panel/master/clinics", nc);
      toast.success("Clínica criada com sucesso");
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

  async function deleteClinic(clinicId: string, name: string) {
    if (!confirm(`Excluir "${name}" permanentemente? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/panel/master/clinics/${clinicId}`);
      toast.success("Cliente excluído");
      load();
    } catch (err: any) {
      toast.error(err.message);
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

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{clinics.length} clientes cadastrados</p>
        </div>
        <Button
          onClick={() => setShowClinic(true)}
          className="bg-[var(--cta)] hover:bg-[var(--cta-h)] text-[var(--bg-0)] gap-2 shadow-[0_0_20px_var(--cta-glow)]"
        >
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {/* Form nova clínica */}
      {showClinic && (
        <Card className="border-[var(--border-m)]">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Novo cliente</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowClinic(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Ex: Clínica Ana Paula" value={nc.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                    setNc((n) => ({ ...n, name, slug }));
                  }} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <Input placeholder="clinica-ana-paula" value={nc.slug}
                  onChange={(e) => setNc((n) => ({ ...n, slug: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome da instância Evolution API</Label>
              <Input placeholder="clinica-ana-paula" value={nc.evolutionInstance}
                onChange={(e) => setNc((n) => ({ ...n, evolutionInstance: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Deve coincidir com o nome da instância criada no Evolution API</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={createClinic} disabled={saving}>
                {saving ? "Criando..." : "Criar cliente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {clinics.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </Card>
        )}
        {clinics.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="bg-[var(--aqua-glow)] p-2.5 rounded-lg shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <Badge variant="outline" className="text-xs font-mono border-border text-muted-foreground">{c.slug}</Badge>
                    {c.active
                      ? <Badge className="bg-primary/15 text-primary border-primary/30 text-xs">Ativa</Badge>
                      : <Badge className="bg-secondary text-muted-foreground border-border text-xs">Inativa</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Instância: <span className="font-mono">{c.evolutionInstance}</span>
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />{c._count.conversations} conversas
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />{c._count.appointments} agendamentos
                    </span>
                  </div>

                  {/* Form criar usuário */}
                  {showUser === c.id && (
                    <div className="mt-4 p-4 bg-secondary rounded-lg space-y-3 border border-border">
                      <p className="text-sm font-medium flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4" />
                        Criar usuário para {c.name}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input className="h-8 text-sm" value={nu.name}
                            onChange={(e) => setNu((u) => ({ ...u, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email</Label>
                          <Input className="h-8 text-sm" type="email" value={nu.email}
                            onChange={(e) => setNu((u) => ({ ...u, email: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Senha</Label>
                          <Input className="h-8 text-sm" type="password" value={nu.password}
                            onChange={(e) => setNu((u) => ({ ...u, password: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowUser(null)}>Cancelar</Button>
                        <Button size="sm" onClick={() => createUser(c.id)} disabled={saving}>
                          {saving ? "Criando..." : "Criar usuário"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {showUser !== c.id && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5"
                      onClick={() => { setShowUser(c.id); setNu({ name: "", email: "", password: "" }); }}>
                      <Users className="h-3.5 w-3.5" />
                      Criar usuário
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`gap-1.5 ${c.active ? "text-orange-400 hover:text-orange-300 border-orange-400/30" : "text-primary hover:text-primary/80 border-primary/30"}`}
                      onClick={() => toggleActive(c.id, !c.active)}
                    >
                      {c.active ? <><PowerOff className="h-3.5 w-3.5" /> Desativar</> : <><Power className="h-3.5 w-3.5" /> Ativar</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive/70 hover:text-destructive border-destructive/20 hover:border-destructive/40"
                      onClick={() => deleteClinic(c.id, c.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
