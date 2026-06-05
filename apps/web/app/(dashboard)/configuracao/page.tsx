"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Plus, X, Save, Stethoscope, Scale, ShoppingBag, Wrench, Target, CalendarCheck, CalendarX, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  systemPrompt: string;
  companyInfo: string;
  services: string[];
  requiredDocs: string[];
  workingHours: WorkingHours;
  appointmentDuration: number;
  adminPhone: string;
  phone: string;
  aiObjective: "agendamento" | "triagem";
  calendarId: string | null;
  googleRefreshToken: string | null;
  reminderEnabled: boolean;
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

const TEMPLATES = [
  {
    icon: Stethoscope,
    label: "Clínica / Saúde",
    prompts: {
      agendamento: `Você é uma atendente virtual de uma clínica. Seu papel é recepcionar pacientes com simpatia, tirar dúvidas sobre os serviços disponíveis e agendar consultas ou procedimentos conforme a disponibilidade da agenda.

Responda sempre de forma clara, objetiva e acolhedora. Nunca invente informações sobre procedimentos ou valores. Se não souber algo, informe que irá verificar com a equipe.

SERVIÇOS OFERECIDOS:
[Liste aqui os serviços com uma breve descrição de cada um]`,
      triagem: `Você é uma atendente virtual de uma clínica. Seu papel é recepcionar pacientes com simpatia, coletar as informações necessárias e encaminhar o caso para o profissional responsável.

Responda sempre de forma clara, objetiva e acolhedora. Nunca invente informações sobre procedimentos ou valores. Se não souber algo, informe que irá verificar com a equipe.

SERVIÇOS OFERECIDOS:
[Liste aqui os serviços com uma breve descrição de cada um]`,
    },
  },
  {
    icon: Scale,
    label: "Escritório Jurídico",
    prompts: {
      agendamento: `Você é uma recepcionista virtual de um escritório de advocacia. Receba os clientes com profissionalismo, colete informações iniciais sobre o caso e agende consultas com os advogados disponíveis.

Seja formal e preciso. Não ofereça orientação jurídica — apenas agende e informe sobre os serviços do escritório.

SERVIÇOS OFERECIDOS:
[Liste aqui as áreas de atuação com uma breve descrição de cada uma]`,
      triagem: `Você é uma recepcionista virtual de um escritório de advocacia. Receba os clientes com profissionalismo e colete as informações iniciais sobre o caso para que um advogado possa analisar e entrar em contato.

Seja formal e preciso. Não ofereça orientação jurídica — apenas colete informações e informe sobre os serviços do escritório.

SERVIÇOS OFERECIDOS:
[Liste aqui as áreas de atuação com uma breve descrição de cada uma]`,
    },
  },
  {
    icon: ShoppingBag,
    label: "Comércio / Loja",
    prompts: {
      agendamento: `Você é uma atendente virtual de uma loja. Auxilie os clientes com informações sobre produtos, preços e disponibilidade, e agende atendimentos presenciais quando necessário.

Seja simpático e prestativo. Sempre que não souber o estoque ou valor exato, oriente o cliente a aguardar confirmação da equipe.

SERVIÇOS OFERECIDOS:
[Liste aqui os produtos ou serviços com uma breve descrição de cada um]`,
      triagem: `Você é uma atendente virtual de uma loja. Auxilie os clientes com informações sobre produtos e colete os dados necessários para que a equipe entre em contato e dê sequência ao atendimento.

Seja simpático e prestativo. Sempre que não souber o estoque ou valor exato, oriente o cliente a aguardar confirmação da equipe.

SERVIÇOS OFERECIDOS:
[Liste aqui os produtos ou serviços com uma breve descrição de cada um]`,
    },
  },
  {
    icon: Wrench,
    label: "Serviços / Técnico",
    prompts: {
      agendamento: `Você é uma atendente virtual de uma empresa de serviços técnicos. Receba solicitações, colete informações sobre o problema do cliente e agende visitas ou atendimentos com os técnicos disponíveis.

Seja claro e organizado. Solicite endereço e detalhes do problema para facilitar o atendimento.

SERVIÇOS OFERECIDOS:
[Liste aqui os serviços técnicos com uma breve descrição de cada um]`,
      triagem: `Você é uma atendente virtual de uma empresa de serviços técnicos. Receba solicitações, colete informações sobre o problema do cliente e registre o caso para que um técnico entre em contato.

Seja claro e organizado. Solicite endereço e detalhes do problema para facilitar a análise.

SERVIÇOS OFERECIDOS:
[Liste aqui os serviços técnicos com uma breve descrição de cada um]`,
    },
  },
];

export default function ConfiguracaoPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [calendarIdInput, setCalendarIdInput] = useState("");
  const [savingCalendar, setSavingCalendar] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  function loadSettings() {
    return api.get<Settings>("/panel/settings").then((data) => {
      setSettings({
        ...data,
        name: data.name ?? "",
        aiName: data.aiName ?? "",
        systemPrompt: data.systemPrompt ?? "",
        phone: data.phone ?? "",
        adminPhone: data.adminPhone ?? "",
        services: Array.isArray(data.services) ? data.services : [],
        requiredDocs: Array.isArray(data.requiredDocs) ? data.requiredDocs : [],
        workingHours: Object.keys(data.workingHours || {}).length > 0
          ? data.workingHours
          : DEFAULT_HOURS,
        companyInfo: data.companyInfo ?? "",
        aiObjective: data.aiObjective ?? "agendamento",
        calendarId: data.calendarId ?? null,
        googleRefreshToken: data.googleRefreshToken ?? null,
        reminderEnabled: data.reminderEnabled ?? true,
      });
      setCalendarIdInput(data.calendarId ?? "");
    });
  }

  useEffect(() => {
    loadSettings().catch((e) => setError(e.message));
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

  async function saveCalendarId() {
    if (!calendarIdInput.trim()) { toast.error("Informe o Calendar ID"); return; }
    setSavingCalendar(true);
    try {
      await api.patch("/panel/settings/calendar-id", { calendarId: calendarIdInput.trim() });
      toast.success("Calendar ID salvo");
      setSettings((s) => s ? { ...s, calendarId: calendarIdInput.trim() } : s);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingCalendar(false);
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => s ? { ...s, [key]: value } : s);
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
    setSaving(true);
    try {
      await api.patch("/panel/settings", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="p-8 text-destructive">Erro ao carregar configurações: {error}</div>;
  if (!settings) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Personalize sua IA e horários de atendimento</p>
      </div>

      {/* Dados do negócio */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados do negócio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do negócio</Label>
              <Input value={settings.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp do negócio</Label>
              <Input placeholder="5511999999999" value={settings.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp do admin (notificações)</Label>
            <Input placeholder="5511999999999" value={settings.adminPhone} onChange={(e) => update("adminPhone", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Objetivo da IA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Objetivo da IA
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Define como a IA conduz o atendimento. O prompt e as ferramentas disponíveis mudam automaticamente conforme a opção escolhida.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "agendamento",
                title: "Agendamento",
                description: "A IA verifica disponibilidade e agenda consultas ou serviços diretamente pelo WhatsApp.",
              },
              {
                value: "triagem",
                title: "Triagem",
                description: "A IA coleta as informações do cliente e avisa que um profissional entrará em contato para analisar o caso.",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const newObjective = opt.value as "agendamento" | "triagem";
                  update("aiObjective", newObjective);
                  if (selectedTemplate) {
                    const tpl = TEMPLATES.find((t) => t.label === selectedTemplate);
                    if (tpl) update("systemPrompt", tpl.prompts[newObjective]);
                  }
                }}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  settings.aiObjective === opt.value
                    ? "border-primary bg-[var(--aqua-glow)]"
                    : "border-border hover:border-[var(--border-m)]"
                }`}
              >
                <p className={`font-medium text-sm ${settings.aiObjective === opt.value ? "text-primary" : "text-foreground"}`}>
                  {opt.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personalidade da IA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Personalidade da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da atendente virtual</Label>
            <Input value={settings.aiName} onChange={(e) => update("aiName", e.target.value)} placeholder="Ex: Ana, Sofia, Maria..." />
          </div>

          <div className="space-y-2">
            <Label>Tipo de negócio — templates de prompt</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(t.label);
                    update("systemPrompt", t.prompts[settings.aiObjective]);
                  }}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left text-sm transition-all ${
                    selectedTemplate === t.label
                      ? "border-primary bg-[var(--aqua-glow)]"
                      : "border-border hover:border-[var(--border-m)] hover:bg-secondary"
                  }`}
                >
                  <t.icon className={`h-4 w-4 shrink-0 ${selectedTemplate === t.label ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={selectedTemplate === t.label ? "text-primary" : "text-foreground"}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prompt do sistema</Label>
            <Textarea
              rows={8}
              value={settings.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
              placeholder="Descreva como a IA deve se comportar, tom de voz, limitações, etc."
              className="resize-none font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Informações para a IA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações para a IA</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tudo que a IA precisa saber para responder os clientes: endereço, como funcionam as reuniões, dúvidas frequentes, diferenciais, etc.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={8}
            value={settings.companyInfo}
            onChange={(e) => update("companyInfo", e.target.value)}
            placeholder={`Exemplos:\n- Endereço: Rua das Flores, 123 — Sala 45, Centro, São Paulo/SP\n- As consultas são realizadas presencialmente e por videochamada (Google Meet)\n- Estacionamento gratuito no local\n- Dúvida frequente: sim, atendemos pelo plano X e Y\n- Dúvida frequente: o primeiro atendimento tem duração de 1 hora`}
            className="resize-none text-sm"
          />
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {settings.aiObjective === "triagem" ? "Informações/documentos para triagem" : "Documentos necessários"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {settings.aiObjective === "triagem"
              ? "A IA vai solicitar esses itens durante a conversa antes de concluir a triagem."
              : "A IA vai solicitar esses documentos pelo WhatsApp antes de confirmar o agendamento."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {settings.requiredDocs.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum documento cadastrado.</p>
            )}
            {settings.requiredDocs.map((doc, i) => (
              <Badge key={i} variant="secondary" className="gap-1.5 pr-1.5 text-sm bg-secondary text-foreground border-border">
                {doc}
                <button type="button" onClick={() => removeDoc(i)} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: RG, CPF, Comprovante de residência..."
              value={newDoc}
              onChange={(e) => setNewDoc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDoc()}
            />
            <Button type="button" variant="outline" size="icon" onClick={addDoc}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Horários de atendimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Duração padrão do agendamento (minutos)</Label>
            <Input
              type="number"
              min={15}
              step={15}
              className="w-32"
              value={settings.appointmentDuration}
              onChange={(e) => update("appointmentDuration", Number(e.target.value))}
            />
          </div>

          <div className="space-y-3 pt-1">
            {DAYS.map(({ key, label }) => {
              const day = settings.workingHours[key] ?? { start: "08:00", end: "18:00", enabled: false };
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={() => toggleDay(key)}
                      id={`day-${key}`}
                    />
                    <label
                      htmlFor={`day-${key}`}
                      className={`w-20 text-sm font-medium cursor-pointer select-none ${
                        day.enabled ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </label>
                    {day.enabled ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            className="w-28 h-8 text-sm"
                            value={day.start}
                            onChange={(e) => setHour(key, "start", e.target.value)}
                          />
                          <span className="text-muted-foreground text-sm">até</span>
                          <Input
                            type="time"
                            className="w-28 h-8 text-sm"
                            value={day.end}
                            onChange={(e) => setHour(key, "end", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLunch(key)}
                          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                            day.lunchStart
                              ? "border-orange-400/40 text-orange-400 bg-orange-400/10 hover:bg-orange-400/15"
                              : "border-dashed border-border text-muted-foreground hover:border-[var(--border-m)] hover:text-foreground"
                          }`}
                        >
                          {day.lunchStart ? "intervalo" : "+ intervalo"}
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Fechado</span>
                    )}
                  </div>
                  {day.enabled && day.lunchStart && (
                    <div className="flex items-center gap-2 ml-[7rem]">
                      <span className="text-xs text-orange-400 w-14">intervalo</span>
                      <Input
                        type="time"
                        className="w-28 h-7 text-sm"
                        value={day.lunchStart}
                        onChange={(e) => setHour(key, "lunchStart", e.target.value)}
                      />
                      <span className="text-muted-foreground text-sm">até</span>
                      <Input
                        type="time"
                        className="w-28 h-7 text-sm"
                        value={day.lunchEnd ?? "13:00"}
                        onChange={(e) => setHour(key, "lunchEnd", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lembrete automático */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Lembrete automático
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Quando ativado, a IA envia uma mensagem de lembrete ao cliente 24 horas antes do agendamento.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Enviar lembrete 24h antes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {settings.reminderEnabled ? "Lembretes ativados" : "Lembretes desativados"}
              </p>
            </div>
            <Switch
              checked={settings.reminderEnabled}
              onCheckedChange={(v) => update("reminderEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {settings.googleRefreshToken
              ? <CalendarCheck className="h-4 w-4 text-primary" />
              : <CalendarX className="h-4 w-4 text-muted-foreground" />}
            Google Calendar
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Conecte sua conta Google para que os agendamentos apareçam automaticamente no seu calendário.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {settings.googleRefreshToken
              ? <span className="text-sm text-primary font-medium">Conta Google conectada</span>
              : <span className="text-sm text-muted-foreground">Nenhuma conta conectada</span>}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={connectGoogle}>
              <CalendarCheck className="h-3.5 w-3.5" />
              {settings.googleRefreshToken ? "Reconectar conta Google" : "Conectar conta Google"}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>ID da Agenda</Label>
            <p className="text-xs text-muted-foreground">
              Crie uma agenda no Google Calendar, acesse as configurações dela e copie o <strong>ID da agenda</strong> (ex: nome@group.calendar.google.com). Use <code className="text-xs bg-secondary px-1 rounded">primary</code> para a agenda principal.
            </p>
            <div className="flex gap-2">
              <Input
                className="text-sm"
                placeholder="nome@group.calendar.google.com"
                value={calendarIdInput}
                onChange={(e) => setCalendarIdInput(e.target.value)}
              />
              <Button
                size="sm"
                onClick={saveCalendarId}
                disabled={savingCalendar}
                className="shrink-0"
              >
                Salvar
              </Button>
            </div>
            {settings.calendarId && (
              <p className="text-xs text-muted-foreground">Atual: {settings.calendarId}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-4">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-[var(--cta)] hover:bg-[var(--cta-h)] text-[var(--bg-0)] font-semibold gap-2 min-w-[160px] shadow-[0_0_24px_var(--cta-glow)]"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}
