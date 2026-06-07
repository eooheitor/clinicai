"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { AuthShell } from "@/components/auth-shell";
import { Loader2 } from "lucide-react";

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", clinicName: "" });

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string; user: any }>("/auth/register", form);
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
      subtitle="7 dias grátis, sem cartão de crédito"
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
        <Field label="Seu nome" htmlFor="name">
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
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" placeholder="maria@empresa.com" value={form.email} onChange={set("email")} required autoComplete="email" />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={set("password")}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </Field>

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
