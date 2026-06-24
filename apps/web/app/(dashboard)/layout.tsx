"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, type AuthUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { BotMessageSquare, Clock, AlertTriangle, Menu } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [humanCount, setHumanCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
  }, [router]);

  useEffect(() => {
    function fetchHuman() {
      api
        .get<{ total: number }>("/panel/conversations?humanMode=true")
        .then((d) => setHumanCount(d.total))
        .catch(() => {});
    }
    fetchHuman();
    const t = setInterval(fetchHuman, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <AppSidebar user={user} humanCount={humanCount} />
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className="w-72 max-w-[80vw] p-0">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <AppSidebar user={user} humanCount={humanCount} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BotMessageSquare className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">ClinicAI</span>
          </div>
        </header>

        <TrialBanner user={user} />

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function TrialBanner({ user }: { user: AuthUser }) {
  const clinic = user.clinic;
  if (!clinic || user.role === "MASTER") return null;

  if (clinic.subscriptionStatus === "TRIAL" && clinic.trialEndsAt) {
    const days = differenceInDays(new Date(clinic.trialEndsAt), new Date());
    if (days < 0) {
      return (
        <div className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive sm:px-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Seu período de teste expirou. Assine para continuar usando o ClinicAI.</span>
          </div>
          <Link href="/assinar" className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80">
            Assinar →
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[var(--warning-soft)] px-4 py-2.5 text-sm text-[var(--warning)] sm:px-6">
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0" />
          <span>
            Seu período de teste termina{" "}
            <strong>{days === 0 ? "hoje" : `em ${days} dia${days !== 1 ? "s" : ""}`}</strong>.
          </span>
        </div>
        <Link href="/assinar" className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80">
          Assinar →
        </Link>
      </div>
    );
  }

  if (clinic.subscriptionStatus === "SUSPENDED" || clinic.subscriptionStatus === "CANCELLED") {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive sm:px-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Seu acesso foi suspenso.</span>
        </div>
        <Link
          href="/assinar"
          className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80"
        >
          Reativar →
        </Link>
      </div>
    );
  }

  return null;
}
