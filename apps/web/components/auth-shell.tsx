import * as React from "react";
import { BotMessageSquare, CalendarCheck, Clock, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
  { icon: Sparkles, text: "Atende e qualifica clientes 24/7" },
  { icon: CalendarCheck, text: "Agenda direto no Google Calendar" },
  { icon: Clock, text: "Lembretes automáticos de consulta" },
];

function BrandPanel() {
  return (
    <aside className="bg-aurora relative hidden flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-12 lg:flex">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative flex items-center gap-3">
        <span className="bg-brand flex size-10 items-center justify-center rounded-xl text-white shadow-[0_4px_18px_var(--accent-glow)]">
          <BotMessageSquare className="size-5" />
        </span>
        <span className="font-display text-xl font-semibold tracking-[-0.01em]">ClinicAI</span>
      </div>

      <div className="relative max-w-md">
        <h2 className="font-display text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.02em] text-foreground">
          O atendente de IA da sua clínica,{" "}
          <span className="text-gradient italic">direto no WhatsApp.</span>
        </h2>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">
          Responde, qualifica e agenda sozinho — 24 horas por dia, com a cara da
          sua marca.
        </p>

        <ul className="mt-8 space-y-3">
          {highlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* Memorable detail: a tiny live-conversation preview */}
        <div className="surface elevate-lg mt-10 max-w-xs space-y-2.5 rounded-2xl p-4">
          <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--accent-soft)] px-3 py-2 text-sm text-foreground">
            Oi! Queria marcar uma avaliação 😊
          </div>
          <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
            Claro! Tenho <strong>quinta às 14h</strong> ou{" "}
            <strong>sexta às 10h</strong>. Qual fica melhor?
          </div>
        </div>
      </div>

      <p className="relative text-xs text-muted-foreground">
        © {new Date().getFullYear()} ClinicAI · Atendimento inteligente
      </p>
    </aside>
  );
}

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <BrandPanel />

      <main className="bg-aurora relative flex items-center justify-center px-4 py-12 sm:px-6 lg:bg-none">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="animate-in-up w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="bg-brand mb-5 flex size-12 items-center justify-center rounded-2xl text-white shadow-[0_4px_24px_var(--accent-glow)] lg:hidden">
              <BotMessageSquare className="size-6" />
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-[-0.025em] text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
