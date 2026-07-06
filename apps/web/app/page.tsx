import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BotMessageSquare,
  CalendarCheck,
  CalendarX2,
  Check,
  Clock,
  MessagesSquare,
  Mic,
  MoonStar,
  Plus,
  QrCode,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { PhoneChat } from "@/components/landing/phone-chat";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";
import { SegmentsMarquee } from "@/components/landing/segments-marquee";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ClinicAI | Atendente de IA para WhatsApp com agendamento automático",
  description:
    "O ClinicAI atende os pacientes da sua clínica no WhatsApp, responde em segundos, entende áudios e agenda consultas direto no Google Calendar. Teste grátis por 3 dias, sem cartão de crédito.",
};

function SectionHeading({
  overline,
  title,
  subtitle,
}: {
  overline: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
        {overline}
      </p>
      <h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-[2.6rem] sm:leading-[1.12]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

const heroStats = [
  { value: "24/7", label: "atendimento no WhatsApp" },
  { value: "Segundos", label: "para responder o paciente" },
  { value: "5 min", label: "para conectar e configurar" },
  { value: "R$ 79,90", label: "por mês, sem fidelidade" },
];

const pains = [
  {
    icon: MoonStar,
    title: "Mensagem às 21h de domingo",
    text: "O paciente pergunta se há horário na segunda. Sem resposta, ele procura outra clínica e agenda por lá. Quando sua equipe abre o WhatsApp, a oportunidade já passou.",
  },
  {
    icon: Users,
    title: "Recepção sobrecarregada",
    text: "A equipe divide a atenção entre o balcão, o telefone e as conversas acumuladas. O atendimento demora, os erros aumentam e a experiência do paciente perde qualidade.",
  },
  {
    icon: CalendarX2,
    title: "Faltas que custam caro",
    text: "Sem confirmação e lembrete, o paciente esquece a consulta e o horário vago só aparece na hora. Cada falta é receita perdida que ninguém consegue recuperar.",
  },
];

const steps = [
  {
    number: "1",
    icon: UserRoundCheck,
    title: "Crie sua conta",
    text: "Cadastro em poucos minutos, com 3 dias de teste grátis e sem cartão de crédito. Você define o nome da atendente, os serviços e os horários da clínica.",
  },
  {
    number: "2",
    icon: QrCode,
    title: "Conecte seu WhatsApp",
    text: "Escaneie o QR Code no painel e conecte o número que a clínica já usa. Sem instalação, sem trocar de chip e sem interromper o atendimento atual.",
  },
  {
    number: "3",
    icon: Sparkles,
    title: "A IA assume o atendimento",
    text: "Pronto. Os pacientes passam a ser respondidos na hora, qualificados e agendados automaticamente. Sua equipe entra apenas quando é realmente necessário.",
  },
];

const planFeatures = [
  "Atendimento com IA no WhatsApp, 24 horas por dia",
  "Agendamento integrado ao Google Calendar",
  "Lembretes automáticos de consulta",
  "Transcrição e resposta de mensagens de voz",
  "IA personalizada com o nome e o tom da sua clínica",
  "Painel de conversas, clientes, agenda e métricas",
  "Modo humano para assumir conversas quando quiser",
];

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Dados isolados por clínica",
    text: "Cada clínica tem a própria instância de WhatsApp e os próprios dados, completamente separados dos demais clientes da plataforma.",
  },
  {
    icon: UserRoundCheck,
    title: "Você no controle",
    text: "A IA trabalha com as regras que você define e transfere para a equipe sempre que o caso pede atenção humana. Pause o atendimento automático quando quiser.",
  },
  {
    icon: Check,
    title: "Sem fidelidade",
    text: "Assinatura mensal simples, sem contrato de permanência. Você pode cancelar quando quiser, direto no painel.",
  },
];

const faqs = [
  {
    q: "Preciso trocar o número de WhatsApp da clínica?",
    a: "Não. Você conecta o número que a clínica já usa escaneando um QR Code no painel, em menos de um minuto. Os pacientes continuam falando com o mesmo contato de sempre.",
  },
  {
    q: "A IA responde qualquer tipo de pergunta?",
    a: "Ela responde com base nas informações da sua clínica: serviços, horários, regras e documentos que você cadastrar. Quando o assunto foge do escopo ou exige atenção humana, a conversa é direcionada para a equipe.",
  },
  {
    q: "E se eu quiser atender pessoalmente?",
    a: "Basta ativar o modo humano na conversa. A IA pausa imediatamente e você responde direto pelo painel. Quando terminar, devolve o atendimento para a IA com um clique.",
  },
  {
    q: "Como funciona o teste grátis?",
    a: "São 3 dias com acesso completo a todas as funcionalidades, sem cartão de crédito. Ao final do período, você decide se quer assinar por R$ 79,90 mensais.",
  },
  {
    q: "Funciona apenas para clínicas?",
    a: "O ClinicAI foi criado para clínicas e consultórios, mas atende bem qualquer negócio que agende horários pelo WhatsApp, como estúdios, salões e prestadores de serviço.",
  },
  {
    q: "Preciso entender de tecnologia para usar?",
    a: "Não. A configuração é guiada e leva poucos minutos. Depois disso a IA trabalha sozinha e você acompanha tudo por um painel simples e direto.",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  text,
  className,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  text: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "surface hover-lift group flex h-full flex-col rounded-3xl p-7 transition-colors hover:border-[var(--accent-strong)]/35",
        className
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] transition-transform duration-300 group-hover:scale-110">
        <Icon className="size-5" />
      </span>
      <h3 className="font-display mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

function CalendarMini() {
  return (
    <div className="mt-auto pt-6">
      <div className="rounded-2xl border border-border bg-[var(--bg-1)] p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
          {[13, 14, 15, 16, 17, 18, 19].map((d) => (
            <span
              key={d}
              className={cn(
                "tabular mt-1 flex h-7 items-center justify-center rounded-lg",
                d === 18
                  ? "bg-brand font-semibold text-white shadow-[0_4px_14px_var(--accent-glow)]"
                  : "text-foreground"
              )}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <span className="h-7 w-1 rounded-full bg-[var(--accent-strong)]" />
          <div>
            <p className="text-[11px] font-semibold text-foreground">Avaliação · Marina Souza</p>
            <p className="text-[10px] text-muted-foreground">Sábado, 9h00 · Google Calendar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReminderMini() {
  return (
    <div className="mt-auto pt-6">
      <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-[var(--bg-1)] p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <BellRing className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-foreground">Ana · Clínica Bem-Estar</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Oi, Marina! Passando para lembrar da sua consulta amanhã às 9h. Até lá!
          </p>
        </div>
      </div>
    </div>
  );
}

function AudioMini() {
  return (
    <div className="mt-auto pt-6">
      <div className="rounded-2xl border border-border bg-[var(--bg-1)] p-4">
        <div className="flex items-center gap-2 text-[var(--accent-strong)]">
          <Mic className="size-4" />
          <span className="flex items-center gap-[3px]">
            {[8, 14, 10, 16, 7, 12, 9, 15, 6, 11, 8, 13, 7].map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-current opacity-70"
                style={{ height: `${h}px` }}
              />
            ))}
          </span>
          <span className="tabular text-[10px] text-muted-foreground">0:06</span>
        </div>
        <p className="mt-2.5 text-[11px] italic leading-relaxed text-muted-foreground">
          &ldquo;Às 9h fica ótimo pra mim, pode confirmar&rdquo;
        </p>
        <p className="mt-1 text-[10px] font-medium text-[var(--accent-strong)]">
          Transcrito e respondido pela IA
        </p>
      </div>
    </div>
  );
}

function AlwaysOnMini() {
  return (
    <div className="mt-auto pt-6">
      <div className="space-y-2 rounded-2xl border border-border bg-[var(--bg-1)] p-4">
        {[
          { time: "21h47", text: "Paciente atendido na hora" },
          { time: "02h13", text: "Dúvida respondida de madrugada" },
          { time: "07h05", text: "Consulta agendada antes do expediente" },
        ].map((item) => (
          <div key={item.time} className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Clock className="size-3" />
            </span>
            <p className="text-[11px] text-muted-foreground">
              <span className="tabular font-semibold text-foreground">{item.time}</span>
              {" · "}
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const personaChips = [
  "Nome: Ana",
  "Tom: acolhedor",
  "Limpeza dental",
  "Clareamento",
  "Avaliação gratuita",
  "Seg a sáb, 8h às 19h",
  "Convênios aceitos",
  "Documentos da clínica",
];

export default function LandingPage() {
  return (
    <div className="force-light min-h-dvh bg-background text-foreground">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="bg-aurora relative overflow-hidden">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
            <div>
              <span
                className="animate-in-up inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
                style={{ animationDelay: "0.05s" }}
              >
                <Sparkles className="size-3.5 text-[var(--accent-strong)]" />
                Atendente de IA para clínicas e consultórios
              </span>

              <h1
                className="font-display animate-in-up mt-6 text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.028em] text-foreground sm:text-6xl lg:text-[4rem]"
                style={{ animationDelay: "0.15s" }}
              >
                <span className="text-gradient italic">Paciente não espera.</span>
                <br />
                Sua clínica responde em{" "}
                <span className="relative inline-block whitespace-nowrap">
                  segundos, 24h.
                  <svg
                    className="draw-stroke absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 14"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      d="M4 10C60 4 150 3 296 8"
                      stroke="var(--accent-strong)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p
                className="animate-in-up mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
                style={{ animationDelay: "0.28s" }}
              >
                O ClinicAI assume o WhatsApp da sua clínica: responde na hora,
                entende áudios, qualifica cada conversa e agenda direto no
                Google Calendar. Sua equipe entra só quando precisa.
              </p>

              <div
                className="animate-in-up mt-8 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "0.4s" }}
              >
                <Link
                  href="/cadastro"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "px-6 shadow-[0_8px_30px_var(--cta-glow)] transition-transform hover:-translate-y-0.5"
                  )}
                >
                  Começar teste grátis
                  <ArrowRight data-icon="inline-end" />
                </Link>
                <a
                  href="#como-funciona"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "px-6"
                  )}
                >
                  Ver como funciona
                </a>
              </div>

              <ul
                className="animate-in-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
                style={{ animationDelay: "0.5s" }}
              >
                {["3 dias grátis", "Sem cartão de crédito", "Cancele quando quiser"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="size-4 text-[var(--accent-strong)]" />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="animate-in-up" style={{ animationDelay: "0.35s" }}>
              <PhoneChat />
            </div>
          </div>

          <div className="relative border-t border-border py-6">
            <SegmentsMarquee />
          </div>
        </section>

        {/* Dores (dark contrast block) */}
        <section className="force-dark bg-background text-foreground">
          <div className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute -right-40 top-10 size-[30rem] rounded-full bg-[var(--accent-soft)] blur-3xl"
              aria-hidden
            />
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
              <Reveal className="max-w-3xl">
                <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--warning)]">
                  <span className="h-px w-8 bg-[var(--warning)]" />
                  O problema
                </p>
                <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.02em] sm:text-[2.8rem] sm:leading-[1.1]">
                  Enquanto ninguém responde, o paciente{" "}
                  <span className="italic text-[var(--warning)]">
                    agenda em outro lugar.
                  </span>
                </h2>
                <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
                  O paciente decide rápido. Quem responde primeiro fica com o
                  horário, e na maioria das vezes não é a clínica que ele
                  procurou primeiro.
                </p>
              </Reveal>

              <Reveal className="reveal-stagger mt-14 grid gap-5 md:grid-cols-3">
                {pains.map((pain) => (
                  <div
                    key={pain.title}
                    className="surface hover-lift h-full rounded-3xl p-7 transition-colors hover:border-[var(--warning)]/40"
                  >
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--warning-soft)] text-[var(--warning)]">
                      <pain.icon className="size-5" />
                    </span>
                    <h3 className="font-display mt-5 text-lg font-semibold text-foreground">
                      {pain.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {pain.text}
                    </p>
                  </div>
                ))}
              </Reveal>

              {/* Stats */}
              <Reveal className="reveal-stagger mt-16 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-border pt-12 lg:grid-cols-4">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="border-l-2 border-[var(--accent-strong)]/50 pl-5"
                  >
                    <p className="font-display text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-5xl">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </Reveal>
            </div>
          </div>
        </section>

        {/* Funcionalidades (bento) */}
        <section
          id="funcionalidades"
          className="scroll-mt-20 border-t border-border bg-[var(--bg-1)]"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeading
              overline="Funcionalidades"
              title={
                <>
                  Tudo o que sua clínica precisa,{" "}
                  <span className="text-gradient italic">em um só lugar</span>
                </>
              }
              subtitle="Do primeiro contato ao lembrete de consulta, o ClinicAI cuida do atendimento completo enquanto sua equipe cuida dos pacientes."
            />

            <Reveal className="reveal-stagger mt-14 grid gap-5 lg:grid-cols-3">
              <div className="surface hover-lift group flex h-full flex-col rounded-3xl p-7 transition-colors hover:border-[var(--accent-strong)]/35 lg:col-span-2">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                  <div className="lg:max-w-[16rem]">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] transition-transform duration-300 group-hover:scale-110">
                      <MessagesSquare className="size-5" />
                    </span>
                    <h3 className="font-display mt-5 text-lg font-semibold text-foreground">
                      Painel completo de gestão
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      Conversas em tempo real, clientes, agenda e métricas de
                      atendimento em um painel simples. Ative o modo humano e
                      assuma qualquer conversa quando quiser.
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <DashboardMockup />
                  </div>
                </div>
              </div>

              <FeatureCard
                icon={Clock}
                title="Atendimento com IA, 24 horas por dia"
                text="Respostas naturais e imediatas para cada paciente, a qualquer hora. A IA conduz a conversa do primeiro contato até o agendamento."
              >
                <AlwaysOnMini />
              </FeatureCard>

              <FeatureCard
                icon={CalendarCheck}
                title="Agendamento automático"
                text="A IA consulta a disponibilidade, propõe horários e cria o evento direto no Google Calendar da clínica."
              >
                <CalendarMini />
              </FeatureCard>

              <FeatureCard
                icon={BellRing}
                title="Lembretes de consulta"
                text="Confirmação enviada no WhatsApp um dia antes de cada consulta. Menos faltas e uma agenda mais previsível."
              >
                <ReminderMini />
              </FeatureCard>

              <FeatureCard
                icon={Mic}
                title="Entende mensagens de voz"
                text="Pacientes falam do jeito que preferem. A IA transcreve os áudios e responde na hora, sem ninguém da equipe digitar."
              >
                <AudioMini />
              </FeatureCard>

              <div className="surface hover-lift group rounded-3xl p-7 transition-colors hover:border-[var(--accent-strong)]/35 lg:col-span-3">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                  <div className="lg:max-w-md">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)] transition-transform duration-300 group-hover:scale-110">
                      <SlidersHorizontal className="size-5" />
                    </span>
                    <h3 className="font-display mt-5 text-lg font-semibold text-foreground">
                      Com a cara da sua clínica
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      Defina o nome da atendente, o tom das respostas, os
                      serviços, os horários e as regras do atendimento. Adicione
                      documentos para deixar a IA ainda mais precisa.
                    </p>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2 lg:justify-end">
                    {personaChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-border bg-[var(--bg-1)] px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[var(--accent-strong)]/40 hover:bg-[var(--accent-soft)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeading
              overline="Como funciona"
              title="Sua clínica atendendo com IA em três passos"
              subtitle="Sem projeto de implantação, sem equipe técnica e sem trocar o número que os pacientes já conhecem."
            />

            <div className="relative mt-14">
              <div
                className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden border-t-2 border-dashed border-[var(--accent-strong)]/25 lg:block"
                aria-hidden
              />
              <Reveal className="reveal-stagger relative grid gap-10 lg:grid-cols-3 lg:gap-6">
                {steps.map((step) => (
                  <div key={step.number} className="text-center">
                    <div className="relative mx-auto w-fit">
                      <span className="bg-brand font-display relative z-10 flex size-24 items-center justify-center rounded-3xl text-white shadow-[0_14px_34px_var(--accent-glow)]">
                        <step.icon className="size-9" />
                      </span>
                      <span className="font-display tabular absolute -right-3 -top-3 z-20 flex size-8 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-[var(--accent-strong)] shadow-sm">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="font-display mt-6 text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                ))}
              </Reveal>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section
          id="planos"
          className="bg-aurora scroll-mt-20 border-t border-border"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeading
              overline="Planos"
              title="Um plano simples, sem surpresa"
              subtitle="Sem taxa de setup, sem fidelidade e sem letra miúda no boleto."
            />

            <Reveal className="relative mx-auto mt-14 max-w-md">
              <div className="absolute -right-40 top-16 hidden w-40 rotate-[5deg] lg:block">
                <svg
                  width="60"
                  height="40"
                  viewBox="0 0 60 40"
                  fill="none"
                  className="text-[var(--txt-3)]"
                  aria-hidden
                >
                  <path
                    d="M56 36C36 34 16 26 8 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M2 13L8 5L16 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <p className="font-hand mt-1 text-xl leading-tight text-[var(--txt-2)]">
                  menos que uma única consulta perdida no mês
                </p>
              </div>

              <div className="bg-brand rounded-[1.85rem] p-[1.5px] shadow-[0_24px_60px_var(--accent-glow)]">
                <div className="relative rounded-[1.75rem] bg-card p-8">
                  <span className="bg-brand absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_18px_var(--accent-glow)]">
                    3 dias grátis
                  </span>

                  <div className="pt-2 text-center">
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      ClinicAI
                    </h3>
                    <div className="mt-4 flex items-baseline justify-center gap-1">
                      <span className="text-lg text-muted-foreground">R$</span>
                      <span className="font-display tabular text-5xl font-semibold tracking-[-0.02em] text-foreground">
                        79,90
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Acesso completo a tudo, desde o primeiro dia.
                    </p>
                  </div>

                  <ul className="mt-7 space-y-3">
                    {planFeatures.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                      >
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                          <Check className="size-3" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/cadastro"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "mt-8 w-full shadow-[0_8px_30px_var(--cta-glow)] transition-transform hover:-translate-y-0.5"
                    )}
                  >
                    Começar teste grátis
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Sem cartão de crédito no teste. Cancele quando quiser.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Confiança */}
        <section className="relative overflow-hidden border-t border-border">
          <div
            className="pointer-events-none absolute -left-40 bottom-0 size-96 rounded-full bg-[var(--accent-soft)] blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeading
              overline="Confiança"
              title="Feito para a rotina real de uma clínica"
              subtitle="Automação não significa perder o controle. Você define as regras e acompanha tudo de perto."
            />

            <Reveal className="reveal-stagger mt-14 grid gap-5 md:grid-cols-3">
              {trustItems.map((item) => (
                <div
                  key={item.title}
                  className="surface hover-lift h-full rounded-3xl p-7 transition-colors hover:border-[var(--accent-strong)]/35"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <item.icon className="size-5" />
                  </span>
                  <h3 className="font-display mt-5 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="duvidas"
          className="scroll-mt-20 border-t border-border bg-[var(--bg-1)]"
        >
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:py-28">
            <SectionHeading
              overline="Dúvidas frequentes"
              title="Perguntas que todo mundo faz"
            />

            <Reveal className="reveal-stagger mt-12 space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="surface group rounded-2xl px-6 py-5 transition-colors hover:border-[var(--accent-strong)]/35"
                >
                  <summary className="flex list-none items-center justify-between gap-4 text-[0.95rem] font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)] transition-transform duration-200 group-open:rotate-45">
                      <Plus className="size-4" />
                    </span>
                  </summary>
                  <p className="pt-3.5 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
            <Reveal>
              <div className="force-dark bg-aurora relative overflow-hidden rounded-[2.5rem] bg-background px-6 py-16 text-center text-foreground sm:px-12 lg:py-24">
                <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
                <div
                  className="pointer-events-none absolute -bottom-40 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-[100%] bg-[var(--accent-glow)] blur-3xl"
                  aria-hidden
                />
                <p className="relative text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                  Comece hoje
                </p>
                <h2 className="font-display relative mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.025em] sm:text-6xl">
                  Pare de perder pacientes{" "}
                  <span className="text-gradient italic">no vácuo.</span>
                </h2>
                <p className="relative mx-auto mt-5 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
                  Ative o ClinicAI hoje e veja as conversas virarem consultas
                  agendadas ainda esta semana.
                </p>
                <div className="relative mt-9">
                  <Link
                    href="/cadastro"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-12 px-8 text-base shadow-[0_10px_40px_var(--cta-glow)] transition-transform hover:-translate-y-0.5"
                    )}
                  >
                    Começar teste grátis de 3 dias
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </div>
                <p className="relative mt-4 text-xs text-muted-foreground">
                  Sem cartão de crédito. Configuração em poucos minutos.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-[var(--bg-1)]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <span className="bg-brand flex size-9 items-center justify-center rounded-xl text-white">
                  <BotMessageSquare className="size-4.5" />
                </span>
                <span className="font-display text-lg font-semibold text-foreground">
                  ClinicAI
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Atendimento inteligente no WhatsApp para clínicas e
                consultórios. Responde, qualifica e agenda pacientes 24 horas
                por dia.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:gap-20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Produto
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {[
                    { href: "#funcionalidades", label: "Funcionalidades" },
                    { href: "#como-funciona", label: "Como funciona" },
                    { href: "#planos", label: "Planos" },
                    { href: "#duvidas", label: "Dúvidas" },
                  ].map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Conta
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li>
                    <Link
                      href="/login"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/cadastro"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Criar conta grátis
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Acessar painel
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-6">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} ClinicAI. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
