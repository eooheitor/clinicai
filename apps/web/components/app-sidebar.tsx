"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Users, Calendar, Settings, Smartphone,
  LogOut, BotMessageSquare, Building2, UserCircle, Sparkles, BarChart3, Lock, type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { cn, getInitials } from "@/lib/utils";
import { logout, type AuthUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge: number;
}

export function navItemsFor(role: string | undefined, humanCount: number): NavItem[] {
  if (role === "MASTER") {
    return [
      { href: "/master/analytics", icon: BarChart3, label: "Analytics", badge: 0 },
      { href: "/master", icon: Building2, label: "Clientes", badge: 0 },
      { href: "/master/presets", icon: Sparkles, label: "Presets de IA", badge: 0 },
      { href: "/usuarios", icon: UserCircle, label: "Usuários", badge: 0 },
    ];
  }
  return [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", badge: 0 },
    { href: "/conversas", icon: MessageSquare, label: "Conversas", badge: humanCount },
    { href: "/clientes", icon: Users, label: "Clientes", badge: 0 },
    { href: "/agendamentos", icon: Calendar, label: "Agendamentos", badge: 0 },
    { href: "/whatsapp", icon: Smartphone, label: "WhatsApp", badge: 0 },
    { href: "/configuracao", icon: Settings, label: "Configurações", badge: 0 },
  ];
}

export function AppSidebar({
  user,
  humanCount,
  blocked,
  onNavigate,
}: {
  user: AuthUser;
  humanCount: number;
  blocked?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItemsFor(user.role, humanCount);
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="bg-brand flex size-9 items-center justify-center rounded-xl text-white shadow-[0_4px_16px_var(--accent-glow)]">
          <BotMessageSquare className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-none tracking-[-0.01em] text-foreground">
            ClinicAI
          </p>
          <p className="mt-1 max-w-[150px] truncate text-xs text-muted-foreground">
            {user.clinic?.name ?? "Painel master"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;

          if (blocked) {
            return (
              <span
                key={item.href}
                title="Disponível após reativar sua assinatura"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/50"
              >
                <Icon className="size-[1.05rem] shrink-0" strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
                <Lock className="size-3.5 shrink-0" />
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "font-medium text-[var(--accent-strong)]"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              {active && (
                <>
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-[var(--accent-soft)]"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                  <motion.span
                    layoutId="nav-active-bar"
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent-strong)]"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                </>
              )}
              <Icon
                className={cn(
                  "relative z-10 size-[1.05rem] shrink-0",
                  active ? "text-[var(--accent-strong)]" : "text-muted-foreground"
                )}
                strokeWidth={2}
              />
              <span className="relative z-10 flex-1">{item.label}</span>
              {item.badge > 0 && (
                <span className="relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warning-soft)] px-1.5 text-[0.7rem] font-semibold text-[var(--warning)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--warning)_24%,transparent)]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-sidebar-accent">
          <Link
            href="/perfil"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">
              {getInitials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.role === "MASTER" ? "Administrador" : "Ver perfil"}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => logout()}
              title="Sair"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
