"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getUser, type AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Field } from "@/components/field";
import { StatusPill } from "@/components/status-pill";
import { Reveal } from "@/components/motion";
import { getInitials } from "@/lib/utils";
import { UserRound, KeyRound, Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

const planLabel: Record<string, { tone: "accent" | "warning" | "destructive"; label: string }> = {
  TRIAL: { tone: "warning", label: "Período de teste" },
  ACTIVE: { tone: "accent", label: "Assinatura ativa" },
  SUSPENDED: { tone: "destructive", label: "Suspenso" },
  CANCELLED: { tone: "destructive", label: "Cancelado" },
};

export default function PerfilPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setUser(u);
      setName(u.name);
      setEmail(u.email);
    }
  }, []);

  async function saveInfo() {
    if (!name || !email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }
    setSavingInfo(true);
    try {
      await api.patch("/auth/me", { name, email });
      toast.success("Dados atualizados. Faça login novamente para ver o nome atualizado.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos de senha");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Nova senha e confirmação não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch("/auth/me", { currentPassword, newPassword });
      toast.success("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  const plan = user?.clinic ? planLabel[user.clinic.subscriptionStatus] : null;

  return (
    <div className={`${wrap} space-y-6`}>
      <PageHeader title="Meu perfil" subtitle="Atualize suas informações de acesso" />

      {/* Hero */}
      <Reveal>
        <div className="bg-aurora surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <span className="bg-brand flex size-20 items-center justify-center rounded-full font-display text-2xl font-semibold text-white shadow-[0_8px_30px_var(--accent-glow)]">
              {getInitials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-semibold text-foreground">{user?.name ?? "—"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StatusPill tone="accent" dot={false}>
                  <ShieldCheck className="size-3" /> {user?.role === "MASTER" ? "Administrador" : "Conta da clínica"}
                </StatusPill>
                {user?.clinic && (
                  <StatusPill tone="muted" dot={false}>
                    <Building2 className="size-3" /> {user.clinic.name}
                  </StatusPill>
                )}
                {plan && <StatusPill tone={plan.tone}>{plan.label}</StatusPill>}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          icon={UserRound}
          title="Informações pessoais"
          footer={<Button onClick={saveInfo} disabled={savingInfo}>{savingInfo ? "Salvando..." : "Salvar"}</Button>}
        >
          <div className="space-y-4">
            <Field label="Nome" htmlFor="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="E-mail" htmlFor="email"><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={KeyRound}
          title="Alterar senha"
          footer={<Button onClick={savePassword} disabled={savingPassword}>{savingPassword ? "Salvando..." : "Alterar senha"}</Button>}
        >
          <div className="space-y-4">
            <Field label="Senha atual" htmlFor="currentPassword"><Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" /></Field>
            <Field label="Nova senha" htmlFor="newPassword"><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></Field>
            <Field label="Confirmar nova senha" htmlFor="confirmPassword"><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" /></Field>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
