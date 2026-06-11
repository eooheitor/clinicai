"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { AuthShell } from "@/components/auth-shell";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Area { id: string; name: string; description: string }

function passwordStrength(password: string) {
  const hasLength = password.length >= 6;
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  if (!password) return { level: 0, label: "", color: "" };
  if (!hasLength) return { level: 1, label: "Fraca", color: "bg-destructive" };
  if (hasLength && !hasSpecial) return { level: 2, label: "Média", color: "bg-amber-500" };
  if (hasLength && hasSpecial && !hasUpper) return { level: 3, label: "Boa", color: "bg-[var(--accent-strong)]" };
  return { level: 4, label: "Forte", color: "bg-[var(--accent-strong)]" };
}

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", clinicName: "" });

  const strength = passwordStrength(form.password);
  const hasLength = form.password.length >= 6;
  const hasSpecial = /[^A-Za-z0-9]/.test(form.password);

  useEffect(() => {
    api.get<Area[]>("/auth/areas").then(setAreas).catch(() => {});
  }, []);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().split(/\s+/).length < 2) {
      setError("Informe nome e sobrenome.");
      return;
    }
    if (!hasSpecial) {
      setError("A senha deve conter ao menos um caractere especial (ex: @, #, !, %).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = { ...form, ...(selectedArea ? { presetId: selectedArea } : {}) };
      const res = await api.post<{ token: string; user: any }>("/auth/register", payload);
      saveAuth(res.token, res.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crie sua conta"
      subtitle="3 dias grátis, sem cartão de crédito"
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Seu nome e sobrenome" htmlFor="name">
          <Input id="name" placeholder="Maria Oliveira" value={form.name} onChange={set("name")} required autoComplete="name" />
        </Field>
        <Field label="Nome da empresa" htmlFor="clinicName">
          <Input
            id="clinicName"
            placeholder="Clínica Saúde & Bem-Estar"
            value={form.clinicName}
            onChange={set("clinicName")}
            required
          />
        </Field>

        {areas.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Sparkles className="size-3.5 text-[var(--accent-strong)]" />
              Área de atuação
              <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {areas.map((area) => {
                const active = selectedArea === area.id;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedArea(active ? null : area.id)}
                    className={cn(
                      "relative rounded-xl border px-3 py-2.5 text-left transition-all duration-150",
                      active
                        ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent-strong)]"
                        : "border-border bg-muted/30 hover:border-[var(--accent-strong)]/50 hover:bg-[var(--accent-soft)]/40"
                    )}
                  >
                    {active && (
                      <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-[var(--accent-strong)]">
                        <Check className="size-2.5 text-white" />
                      </span>
                    )}
                    <p className={cn("text-xs font-semibold", active ? "text-[var(--accent-strong)]" : "text-foreground")}>
                      {area.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                      {area.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" placeholder="maria@empresa.com" value={form.email} onChange={set("email")} required autoComplete="email" />
        </Field>

        <div className="space-y-2">
          <Field label="Senha" htmlFor="password">
            <Input
              id="password"
              type="password"
              placeholder="Crie uma senha segura"
              value={form.password}
              onChange={set("password")}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>

          {form.password.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-300",
                      strength.level >= bar ? strength.color : "bg-muted"
                    )}
                  />
                ))}
                <span
                  className={cn(
                    "ml-1 min-w-[36px] text-right text-xs font-semibold transition-colors duration-300",
                    strength.level === 1 && "text-destructive",
                    strength.level === 2 && "text-amber-500",
                    strength.level >= 3 && "text-[var(--accent-strong)]"
                  )}
                >
                  {strength.label}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <Criterion met={hasLength} label="Mínimo 6 caracteres" />
                <Criterion met={hasSpecial} label="Ao menos um caractere especial (@, #, !, %...)" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          Criar conta grátis
        </Button>
      </form>
    </AuthShell>
  );
}

function Criterion({ met, label }: { met: boolean; label: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors duration-200",
        met ? "text-[var(--accent-strong)]" : "text-muted-foreground"
      )}
    >
      {met ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0 opacity-40" />}
      {label}
    </span>
  );
}
