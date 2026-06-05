"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { BotMessageSquare, Loader2 } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--aqua-glow)] blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="inline-flex bg-primary p-3 rounded-2xl mb-4 shadow-[0_0_32px_var(--cta-glow)]">
            <BotMessageSquare className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            7 dias grátis, sem cartão de crédito
          </p>
        </div>

        <Card className="border-[var(--border-m)] shadow-[0_0_40px_rgba(0,210,200,.06)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Seu nome
                </Label>
                <Input id="name" placeholder="Maria Oliveira" value={form.name} onChange={set("name")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clinicName" className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Nome da empresa
                </Label>
                <Input id="clinicName" placeholder="Clínica Saúde & Bem-Estar" value={form.clinicName} onChange={set("clinicName")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Email
                </Label>
                <Input id="email" type="email" placeholder="maria@empresa.com" value={form.email} onChange={set("email")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Senha
                </Label>
                <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set("password")} required minLength={6} />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-[var(--cta)] hover:bg-[var(--cta-h)] text-[var(--bg-0)] font-semibold shadow-[0_0_24px_var(--cta-glow)] transition-all"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar conta grátis
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
