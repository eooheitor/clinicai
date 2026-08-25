"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Field } from "@/components/field";
import { KnowledgeDocs, type KnowledgeDoc } from "@/components/knowledge-docs";
import { PresetPicker } from "@/components/preset-picker";
import { cn, maskPhoneBR, localPhoneBR, toStoredPhoneBR } from "@/lib/utils";
import {
  Bot, Clock, Plus, X, Save, Target,
  CalendarCheck, CalendarX, Bell, Building2, FileText, Info, Check, Plug,
} from "lucide-react";
import { toast } from "sonner";

interface DayHours {
  start: string;
  end: string;
  enabled: boolean;
  lunchStart?: string;
  lunchEnd?: string;
}

interface WorkingHours {
  [day: string]: DayHours;
}

interface Settings {
  name: string;
  aiName: string;
  clientInstructions: string;
  companyInfo: string;
  services: string[];
  requiredDocs: string[];
  workingHours: WorkingHours;
  appointmentDuration: number;
  adminPhone: string;
  phone: string;
  aiObjective: "agendamento" | "triagem";
  calendarId: string | null;
  calendarConnected: boolean;
  reminderEnabled: boolean;
  preset: { id: string; name: string; description: string | null } | null;
  presetId: string | null;
}

interface PresetOption {
  id: string;
  name: string;
  description: string | null;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

const DAYS = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const DEFAULT_HOURS: WorkingHours = Object.fromEntries(
  DAYS.map(({ key }, i) => [key, { start: "08:00", end: "18:00", enabled: i < 5 }])
);

const wrap = "px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8";

function snapshot(s: Settings) {
  const { calendarId, calendarConnected, preset, ...tracked } = s;
  return JSON.stringify(tracked);
}

interface TimeRangeProps {
  label: string;
  start: string;
  end: string;
  onStart: (val: string) => void;
  onEnd: (val: string) => void;
  accent?: boolean;
  onRemove?: () => void;
}

function TimeRange({ label, start, end, onStart, onEnd, accent, onRemove }: TimeRangeProps) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span
        className={cn(
          "text-xs font-medium sm:w-24 sm:shrink-0",
          accent ? "text-[var(--warning)]" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <Input type="time" className="h-9 w-[6.5rem] text-sm" value={start} onChange={(e) => onStart(e.target.value)} />
        <span className="text-sm text-muted-foreground">até</span>
        <Input type="time" className="h-9 w-[6.5rem] text-sm" value={end} onChange={(e) => onEnd(e.target.value)} />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover intervalo"
            className="focus-ring ml-1 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConfiguracaoPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [newDoc, setNewDoc] = useState("");
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [calendarIdInput, setCalendarIdInput] = useState("");
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [manualCalendar, setManualCalendar] = useState(false);
  const [tab, setTab] = useState<"negocio" | "ia" | "docs" | "horarios" | "integracoes">("negocio");
  const searchParams = useSearchParams();
  const router = useRouter();

  function loadSettings() {
    return api.get<Settings>("/panel/settings").then((data) => {
      const next: Settings = {
        ...data,
        name: data.name ?? "",
        aiName: data.aiName ?? "",
        clientInstructions: data.clientInstructions ?? "",
        phone: localPhoneBR(data.phone),
        adminPhone: localPhoneBR(data.adminPhone),
        services: Array.isArray(data.services) ? data.services : [],
        requiredDocs: Array.isArray(data.requiredDocs) ? data.requiredDocs : [],
        workingHours:
          Object.keys(data.workingHours || {}).length > 0 ? data.workingHours : DEFAULT_HOURS,
        companyInfo: data.companyInfo ?? "",
        aiObjective: data.aiObjective ?? "agendamento",
        calendarId: data.calendarId ?? null,
        calendarConnected: data.calendarConnected ?? false,
        reminderEnabled: data.reminderEnabled ?? true,
        preset: data.preset ?? null,
        presetId: data.preset?.id ?? null,
      };
      setSettings(next);
      setBaseline(snapshot(next));
      setCalendarIdInput(data.calendarId ?? "");
    });
  }

  useEffect(() => {
    loadSettings().catch((e) => setError(e.message));
    api.get<KnowledgeDoc[]>("/panel/documents").then(setKnowledgeDocs).catch(() => {});
    api.get<PresetOption[]>("/panel/presets").then(setPresets).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("calendarConnected")) {
      toast.success("Google Calendar conectado com sucesso!");
      loadSettings().catch(() => {});
      router.replace("/configuracao");
    } else if (searchParams.get("calendarError")) {
      toast.error("Erro ao conectar Google Calendar. Tente novamente.");
      router.replace("/configuracao");
    }
  }, [searchParams]);

  async function connectGoogle() {
    try {
      const { url } = await api.get<{ url: string }>("/panel/settings/google/auth-url");
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function loadCalendars() {
    setLoadingCalendars(true);
    try {
      const list = await api.get<GoogleCalendar[]>("/panel/settings/google/calendars");
      setCalendars(list);
      if (list.length === 0) setManualCalendar(true);
    } catch {
      setManualCalendar(true);
    } finally {
      setLoadingCalendars(false);
    }
  }

  useEffect(() => {
    if (settings?.calendarConnected) loadCalendars();
    else {
      setCalendars([]);
      setManualCalendar(false);
    }
  }, [settings?.calendarConnected]);

  async function saveCalendarId() {
    if (!calendarIdInput.trim()) {
      toast.error("Informe o Calendar ID");
      return;
    }
    setSavingCalendar(true);
    try {
      await api.patch("/panel/settings/calendar-id", { calendarId: calendarIdInput.trim() });
      toast.success("Calendar ID salvo");
      setSettings((s) => (s ? { ...s, calendarId: calendarIdInput.trim() } : s));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingCalendar(false);
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  function addDoc() {
    const doc = newDoc.trim();
    if (!doc || !settings) return;
    update("requiredDocs", [...settings.requiredDocs, doc]);
    setNewDoc("");
  }

  function removeDoc(i: number) {
    if (!settings) return;
    update("requiredDocs", settings.requiredDocs.filter((_, idx) => idx !== i));
  }

  function toggleDay(day: string) {
    if (!settings) return;
    const wh = { ...settings.workingHours };
    wh[day] = { ...wh[day], enabled: !wh[day]?.enabled };
    update("workingHours", wh);
  }

  function setHour(day: string, field: "start" | "end" | "lunchStart" | "lunchEnd", val: string) {
    if (!settings) return;
    const wh = { ...settings.workingHours };
    wh[day] = { ...wh[day], [field]: val };
    update("workingHours", wh);
  }

  function toggleLunch(day: string) {
    if (!settings) return;
    const wh = { ...settings.workingHours };
    const current = wh[day];
    if (current.lunchStart) {
      const { lunchStart, lunchEnd, ...rest } = current;
      wh[day] = rest as DayHours;
    } else {
      wh[day] = { ...current, lunchStart: "12:00", lunchEnd: "13:00" };
    }
    update("workingHours", wh);
  }

  async function save() {
    if (!settings) return;
    if (!settings.presetId) {
      toast.error("Selecione a área de atuação antes de salvar.");
      setTab("ia");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/panel/settings", {
        ...settings,
        phone: toStoredPhoneBR(settings.phone),
        adminPhone: toStoredPhoneBR(settings.adminPhone),
      });
      setBaseline(snapshot(settings));
      toast.success("Configurações salvas");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className={wrap}>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
          Erro ao carregar configurações: {error}
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={wrap}>
        <PageHeader title="Configurações" subtitle="Personalize sua IA e horários de atendimento" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const docsLabel =
    settings.aiObjective === "triagem"
      ? "Informações para triagem"
      : "Documentos necessários";
  const dirty = baseline !== null && snapshot(settings) !== baseline;

  return (
    <div className={wrap}>
      <PageHeader title="Configurações" subtitle="Personalize sua IA e horários de atendimento" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Vertical section nav */}
        <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-4 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-2 lg:elevate-sm">
          {[
            { id: "negocio", label: "Negócio", icon: Building2 },
            { id: "ia", label: "IA", icon: Bot },
            { id: "docs", label: settings.aiObjective === "triagem" ? "Triagem" : "Documentos", icon: FileText },
            { id: "horarios", label: "Horários", icon: Clock },
            { id: "integracoes", label: "Integrações", icon: Plug },
          ].map((s) => {
            const Icon = s.icon;
            const active = tab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTab(s.id as typeof tab)}
                className={cn(
                  "focus-ring flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:w-full",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" /> {s.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 max-w-4xl">
        {/* NEGÓCIO */}
        {tab === "negocio" && (
        <div className="space-y-6">
          <SectionCard icon={Building2} title="Dados do negócio" description="Informações básicas usadas pela IA e nas notificações.">
            <Field label="Nome do negócio" htmlFor="name">
              <Input id="name" value={settings.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp do negócio" htmlFor="phone" hint="Número conectado que atende seus clientes.">
                <Input id="phone" inputMode="tel" placeholder="(11) 99999-9999" value={maskPhoneBR(settings.phone)} onChange={(e) => update("phone", localPhoneBR(e.target.value))} />
              </Field>
              <Field label="WhatsApp do admin" htmlFor="adminPhone" hint="Recebe notificações de agendamentos e triagens.">
                <Input id="adminPhone" inputMode="tel" placeholder="(11) 99999-9999" value={maskPhoneBR(settings.adminPhone)} onChange={(e) => update("adminPhone", localPhoneBR(e.target.value))} />
              </Field>
            </div>
          </SectionCard>
        </div>
        )}

        {/* IA */}
        {tab === "ia" && (
        <div className="space-y-6">
          <SectionCard icon={Target} title="Objetivo da IA" description="Define como a IA conduz o atendimento — o prompt e as ferramentas mudam conforme a opção.">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { value: "agendamento", title: "Agendamento", description: "A IA verifica disponibilidade e agenda consultas ou serviços direto pelo WhatsApp." },
                { value: "triagem", title: "Triagem", description: "A IA coleta as informações do cliente e avisa que um profissional entrará em contato." },
              ].map((opt) => {
                const active = settings.aiObjective === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("aiObjective", opt.value as "agendamento" | "triagem")}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent-strong)]"
                        : "border-border hover:border-[var(--border-m)]"
                    )}
                  >
                    <p className={cn("text-sm font-medium", active ? "text-[var(--accent-strong)]" : "text-foreground")}>
                      {opt.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard icon={Bot} title="Personalidade da IA" description="Nome da atendente e instruções complementares de comportamento.">
            <Field label="Nome da atendente virtual" htmlFor="aiName">
              <Input id="aiName" value={settings.aiName} onChange={(e) => update("aiName", e.target.value)} placeholder="Ex: Ana, Sofia, Maria..." />
            </Field>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Área de atuação</Label>
                {!settings.presetId && (
                  <span className="text-[11px] font-medium text-destructive">Obrigatório</span>
                )}
              </div>

              <PresetPicker
                presets={presets}
                value={settings.presetId}
                onChange={(id) => update("presetId", id)}
              />

              {!settings.presetId && (
                <p className="text-xs leading-relaxed text-muted-foreground/70">
                  Escolha a área que melhor descreve sua clínica — ela define o comportamento-base e o escopo de assuntos da IA. As instruções complementares abaixo ajustam os detalhes.
                </p>
              )}
            </div>

            <Field
              label="Instruções complementares"
              htmlFor="clientInstructions"
              className="mt-4"
              hint={
                settings.preset
                  ? "Detalhes e preferências da sua clínica. Elas não substituem as regras principais definidas pela equipe."
                  : "Descreva como a IA deve se comportar, tom de voz, limitações, etc."
              }
            >
              <Textarea
                id="clientInstructions"
                rows={7}
                value={settings.clientInstructions}
                onChange={(e) => update("clientInstructions", e.target.value)}
                placeholder="Ex: trate os pacientes por 'você', mencione que aceitamos PIX, reforce o estacionamento gratuito..."
                className="resize-none font-mono text-xs leading-relaxed"
              />
            </Field>
          </SectionCard>

          <SectionCard icon={FileText} title="Base de conhecimento" description="Anexe documentos (PDF, TXT ou Markdown) com informações que a IA deve usar nas respostas — tabelas de preços, perguntas frequentes, regras internas.">
            <KnowledgeDocs
              docs={knowledgeDocs}
              limit={5}
              onUpload={async (file) => {
                const fd = new FormData();
                fd.append("file", file);
                const doc = await api.upload<KnowledgeDoc>("/panel/documents", fd);
                setKnowledgeDocs((d) => [doc, ...d]);
              }}
              onDelete={async (doc) => {
                await api.delete(`/panel/documents/${doc.id}`);
                setKnowledgeDocs((d) => d.filter((x) => x.id !== doc.id));
              }}
            />
          </SectionCard>

          <SectionCard icon={Info} title="Informações para a IA" description="Tudo que a IA precisa saber: endereço, como funcionam as reuniões, dúvidas frequentes, diferenciais.">
            <Textarea
              rows={8}
              value={settings.companyInfo}
              onChange={(e) => update("companyInfo", e.target.value)}
              placeholder={`Exemplos:\n- Endereço: Rua das Flores, 123 — Sala 45, Centro, São Paulo/SP\n- As consultas são presenciais e por videochamada (Google Meet)\n- Estacionamento gratuito no local\n- Atendemos os planos X e Y`}
              className="resize-none text-sm leading-relaxed"
            />
          </SectionCard>
        </div>
        )}

        {/* DOCUMENTOS */}
        {tab === "docs" && (
        <div className="space-y-6">
          <SectionCard
            icon={FileText}
            title={docsLabel}
            description={
              settings.aiObjective === "triagem"
                ? "A IA vai solicitar esses itens durante a conversa antes de concluir a triagem."
                : "A IA vai solicitar esses documentos antes de confirmar o agendamento."
            }
          >
            <div className="flex min-h-9 flex-wrap gap-2">
              {settings.requiredDocs.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum item cadastrado ainda.</p>
              )}
              {settings.requiredDocs.map((doc, i) => (
                <Badge key={i} variant="secondary" className="gap-1.5 pr-1.5 text-sm">
                  {doc}
                  <button type="button" onClick={() => removeDoc(i)} className="transition-colors hover:text-destructive" aria-label={`Remover ${doc}`}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Ex: RG, CPF, Comprovante de residência..."
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDoc())}
              />
              <Button type="button" variant="outline" onClick={addDoc} className="shrink-0">
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
          </SectionCard>
        </div>
        )}

        {/* HORÁRIOS */}
        {tab === "horarios" && (
        <div className="space-y-6">
          <SectionCard icon={Clock} title="Horários de atendimento" description="Defina os dias e horários em que a IA pode agendar.">
            <Field
              label="Duração padrão do agendamento"
              htmlFor="duration"
              hint="Usada para calcular o fim de cada horário que a IA oferece."
            >
              <div className="flex items-center gap-2">
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  step={15}
                  className="w-24"
                  value={settings.appointmentDuration}
                  onChange={(e) => update("appointmentDuration", Number(e.target.value))}
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
            </Field>

            <div className="mt-5 space-y-2.5">
              {DAYS.map(({ key, label }) => {
                const day = settings.workingHours[key] ?? { start: "08:00", end: "18:00", enabled: false };
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      day.enabled ? "border-border" : "border-transparent bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Switch checked={day.enabled} onCheckedChange={() => toggleDay(key)} id={`day-${key}`} />
                      <label
                        htmlFor={`day-${key}`}
                        className={cn("cursor-pointer select-none text-sm font-medium", day.enabled ? "text-foreground" : "text-muted-foreground")}
                      >
                        {label}
                      </label>
                      {day.enabled && !day.lunchStart && (
                        <button
                          type="button"
                          onClick={() => toggleLunch(key)}
                          className="focus-ring ml-auto rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-[var(--border-m)] hover:text-foreground"
                        >
                          + Intervalo
                        </button>
                      )}
                      {!day.enabled && <span className="ml-auto text-sm text-muted-foreground">Fechado</span>}
                    </div>
                    {day.enabled && (
                      <div className="mt-3 space-y-2.5">
                        <TimeRange
                          label="Atendimento"
                          start={day.start}
                          end={day.end}
                          onStart={(v) => setHour(key, "start", v)}
                          onEnd={(v) => setHour(key, "end", v)}
                        />
                        {day.lunchStart && (
                          <TimeRange
                            label="Intervalo"
                            accent
                            start={day.lunchStart}
                            end={day.lunchEnd ?? "13:00"}
                            onStart={(v) => setHour(key, "lunchStart", v)}
                            onEnd={(v) => setHour(key, "lunchEnd", v)}
                            onRemove={() => toggleLunch(key)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
        )}

        {/* INTEGRAÇÕES */}
        {tab === "integracoes" && (
        <div className="space-y-6">
          <SectionCard icon={Bell} title="Lembrete automático" description="Envia uma mensagem ao cliente 24 horas antes do agendamento.">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Enviar lembrete 24h antes</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {settings.reminderEnabled ? "Lembretes ativados" : "Lembretes desativados"}
                </p>
              </div>
              <Switch checked={settings.reminderEnabled} onCheckedChange={(v) => update("reminderEnabled", v)} />
            </div>
          </SectionCard>

          <SectionCard
            icon={settings.calendarConnected ? CalendarCheck : CalendarX}
            title="Google Calendar"
            description="Conecte sua conta Google para que os agendamentos apareçam no seu calendário."
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              {settings.calendarConnected ? (
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--accent-strong)]">
                  <CalendarCheck className="size-4" /> Conta Google conectada
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarX className="size-4" /> Nenhuma conta conectada
                </span>
              )}
              <Button variant="outline" size="sm" onClick={connectGoogle}>
                {settings.calendarConnected ? "Reconectar" : "Conectar conta Google"}
              </Button>
            </div>

            {!settings.calendarConnected ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Conecte sua conta Google para escolher a agenda a ser usada.
              </p>
            ) : (
              <Field
                label="Agenda utilizada"
                htmlFor="calendarId"
                className="mt-4"
                hint="Selecione a agenda do Google Calendar onde os agendamentos serão criados."
              >
                {loadingCalendars ? (
                  <p className="text-sm text-muted-foreground">Carregando agendas…</p>
                ) : manualCalendar ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="calendarId"
                      className="font-mono text-sm"
                      placeholder="nome@group.calendar.google.com"
                      value={calendarIdInput}
                      onChange={(e) => setCalendarIdInput(e.target.value)}
                    />
                    <Button onClick={saveCalendarId} disabled={savingCalendar} className="shrink-0">
                      {savingCalendar ? "Salvando..." : "Salvar ID"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      id="calendarId"
                      className="h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-base shadow-[var(--shadow-sm)] outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 md:text-sm dark:bg-input/20"
                      value={calendarIdInput}
                      onChange={(e) => setCalendarIdInput(e.target.value)}
                    >
                      <option value="" disabled>
                        Selecione uma agenda…
                      </option>
                      {calendarIdInput &&
                        !calendars.some((c) => c.id === calendarIdInput) && (
                          <option value={calendarIdInput}>{calendarIdInput} (atual)</option>
                        )}
                      {calendars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.summary}
                          {c.primary ? " (principal)" : ""}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={saveCalendarId}
                      disabled={savingCalendar || !calendarIdInput}
                      className="shrink-0"
                    >
                      {savingCalendar ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                )}
                {!loadingCalendars && (
                  <button
                    type="button"
                    onClick={() => setManualCalendar((v) => !v)}
                    className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {manualCalendar ? "Escolher da lista" : "Digitar o ID manualmente"}
                  </button>
                )}
              </Field>
            )}
            {settings.calendarId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Agenda atual: <span className="font-mono">{settings.calendarId}</span>
              </p>
            )}
          </SectionCard>
        </div>
        )}
        </div>
      </div>

      {/* Floating save bar */}
      <div className="pointer-events-none sticky bottom-4 z-10 mt-8 flex justify-end">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-2 pl-4 shadow-lg backdrop-blur">
          {dirty ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full bg-[var(--warning)]" />
              Alterações não salvas
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Check className="size-4 text-[var(--accent-strong)]" />
              Tudo salvo
            </span>
          )}
          <Button onClick={save} disabled={saving || !dirty} className="min-w-[150px]">
            <Save className="size-4" />
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
