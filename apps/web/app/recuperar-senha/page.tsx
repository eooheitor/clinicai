"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { AuthShell } from "@/components/auth-shell";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link para redefinir sua senha"
      footer={
        <>
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Voltar ao login
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="size-12 text-[var(--accent-strong)]" />
          <div>
            <p className="font-medium text-foreground">Verifique seu e-mail</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Se existe uma conta com <strong>{email}</strong>, você receberá um link em instantes.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Enviar link de recuperação
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
