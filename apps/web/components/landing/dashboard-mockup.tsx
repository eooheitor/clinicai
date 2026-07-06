import {
  BotMessageSquare,
  CalendarCheck,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  Users,
} from "lucide-react";

const stats = [
  { label: "Conversas hoje", value: "128", delta: "+12%" },
  { label: "Agendamentos", value: "32", delta: "+8%" },
  { label: "Taxa de resposta", value: "100%", delta: "24/7" },
];

const bars = [42, 58, 50, 72, 64, 88, 96];

const conversations = [
  { name: "Marina Souza", preview: "Perfeito, sábado às 9h então!", time: "21:47" },
  { name: "Carlos Lima", preview: "Obrigado pelo lembrete 🙏", time: "20:12" },
  { name: "Paula Andrade", preview: "Áudio de 0:06", time: "19:38" },
];

const navItems = [
  { icon: LayoutDashboard, active: true },
  { icon: MessagesSquare, active: false },
  { icon: Users, active: false },
  { icon: CalendarCheck, active: false },
  { icon: Settings, active: false },
];

export function DashboardMockup() {
  return (
    <div className="surface elevate-lg overflow-hidden rounded-2xl">
      {/* Window bar */}
      <div className="flex items-center gap-2 border-b border-border bg-[var(--bg-1)] px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#f87171]/70" />
          <span className="size-2.5 rounded-full bg-[#fbbf24]/70" />
          <span className="size-2.5 rounded-full bg-[#34d399]/70" />
        </span>
        <span className="mx-auto flex items-center gap-1.5 rounded-md bg-card px-3 py-1 text-[10px] text-muted-foreground">
          app.clinicai.com.br/dashboard
        </span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-12 flex-col items-center gap-1 border-r border-border bg-[var(--bg-1)] py-3 sm:flex">
          <span className="bg-brand mb-2 flex size-7 items-center justify-center rounded-lg text-white">
            <BotMessageSquare className="size-3.5" />
          </span>
          {navItems.map(({ icon: Icon, active }, i) => (
            <span
              key={i}
              className={`flex size-7 items-center justify-center rounded-lg ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="size-3.5" />
            </span>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3 p-4">
          <div className="grid grid-cols-3 gap-2.5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-2.5">
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-display tabular text-base font-semibold text-foreground">
                    {s.value}
                  </span>
                  <span className="text-[9px] font-medium text-[var(--accent-strong)]">
                    {s.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1.2fr] gap-2.5">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] text-muted-foreground">Mensagens nos últimos 7 dias</p>
              <div className="mt-2 flex h-20 items-end gap-1.5">
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className="mock-bar flex-1 rounded-t-[3px] bg-[var(--accent-strong)]"
                    style={{ height: `${h}%`, opacity: 0.35 + (i / bars.length) * 0.65 }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-border bg-card p-3">
              <p className="text-[9px] text-muted-foreground">Conversas recentes</p>
              {conversations.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[8px] font-semibold text-[var(--accent-strong)]">
                    {c.name.split(" ").map((p) => p[0]).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium text-foreground">{c.name}</p>
                    <p className="truncate text-[9px] text-muted-foreground">{c.preview}</p>
                  </div>
                  <span className="tabular shrink-0 text-[8px] text-muted-foreground">
                    {c.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
