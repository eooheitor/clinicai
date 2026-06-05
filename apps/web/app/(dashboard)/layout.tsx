"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, logout, type AuthUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MessageSquare, Users, Calendar,
  Settings, Smartphone, LogOut, BotMessageSquare, Building2, UserCircle, Clock, AlertTriangle,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [humanCount, setHumanCount] = useState(0);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, []);

  useEffect(() => {
    function fetchHuman() {
      api.get<{ total: number }>("/panel/conversations?humanMode=true")
        .then((d) => setHumanCount(d.total))
        .catch(() => {});
    }
    fetchHuman();
    const t = setInterval(fetchHuman, 30_000);
    return () => clearInterval(t);
  }, []);

  function navItems(role?: string) {
    if (role === "MASTER") {
      return [
        { href: "/master",   icon: Building2,   label: "Clientes", badge: 0 },
        { href: "/usuarios", icon: UserCircle,   label: "Usuários", badge: 0 },
      ];
    }
    return [
      { href: "/dashboard",    icon: LayoutDashboard,  label: "Dashboard",       badge: 0 },
      { href: "/conversas",    icon: MessageSquare,     label: "Conversas",       badge: humanCount },
      { href: "/clientes",     icon: Users,             label: "Clientes",        badge: 0 },
      { href: "/agendamentos", icon: Calendar,          label: "Agendamentos",    badge: 0 },
      { href: "/whatsapp",     icon: Smartphone,        label: "WhatsApp",        badge: 0 },
      { href: "/configuracao", icon: Settings,          label: "Configurações",   badge: 0 },
    ];
  }

  function TrialBanner() {
    const clinic = user?.clinic;
    if (!clinic || user?.role === "MASTER") return null;

    if (clinic.subscriptionStatus === "TRIAL" && clinic.trialEndsAt) {
      const days = differenceInDays(new Date(clinic.trialEndsAt), new Date());
      if (days < 0) return null;
      return (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Seu trial termina em <strong>{days === 0 ? "hoje" : `${days} dia${days !== 1 ? "s" : ""}`}</strong>.
            </span>
          </div>
          <Link href="/assinar" className="font-semibold underline underline-offset-2 hover:text-amber-300 shrink-0">
            Assinar agora →
          </Link>
        </div>
      );
    }

    if (clinic.subscriptionStatus === "SUSPENDED" || clinic.subscriptionStatus === "CANCELLED") {
      return (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Seu acesso foi suspenso.</span>
          </div>
          <Link href="/assinar" className="font-semibold underline underline-offset-2 shrink-0">
            Reativar assinatura →
          </Link>
        </div>
      );
    }

    return null;
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-[var(--bg-0)] p-1.5 rounded-lg shadow-[0_0_14px_var(--aqua-glow)]">
              <BotMessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm leading-none text-foreground">ClinicAI</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">
                {user.clinic?.name ?? "Master"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems(user?.role).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  active
                    ? "bg-[var(--aqua-glow)] text-primary font-medium shadow-[inset_3px_0_0_var(--aqua)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}>
                  <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-[var(--txt-3)]")} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-orange-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none py-1">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <Link href="/perfil">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--aqua-glow)] text-primary text-xs font-semibold">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{user.name}</p>
                {user.role === "MASTER" && (
                  <Badge variant="outline" className="text-xs px-1 py-0 border-primary/40 text-primary">Master</Badge>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.preventDefault(); logout(); }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <TrialBanner />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
