"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  BotMessageSquare,
  CalendarCheck,
  Mic,
  Phone,
  SendHorizonal,
  Sparkles,
  Video,
  Wifi,
} from "lucide-react";

type ChatStep =
  | { from: "patient"; text: string }
  | { from: "patient"; audio: true }
  | { from: "ai"; text: React.ReactNode }
  | { from: "system"; text: string };

const script: ChatStep[] = [
  { from: "patient", text: "Boa noite! Vocês têm horário para avaliação no sábado?" },
  {
    from: "ai",
    text: (
      <>
        Boa noite! Temos sim. Posso agendar às <strong>9h</strong> ou às{" "}
        <strong>11h30</strong>. Qual prefere?
      </>
    ),
  },
  { from: "patient", audio: true },
  {
    from: "ai",
    text: "Perfeito, sábado às 9h com a Dra. Camila. Um dia antes eu te envio um lembrete por aqui. Até lá, Marina!",
  },
  { from: "system", text: "Evento criado no Google Calendar" },
];

function FloatingChip({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof Sparkles;
  label: string;
  className: string;
}) {
  return (
    <div
      className={`glass elevate-md absolute z-20 hidden items-center gap-2 rounded-full border border-border py-2 pl-2 pr-4 lg:flex ${className}`}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
        <Icon className="size-3.5" />
      </span>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  );
}

function AudioWave() {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {[7, 13, 9, 15, 6, 11, 8, 14, 5, 10, 7].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-current opacity-70"
          style={{ height: `${h}px` }}
        />
      ))}
    </span>
  );
}

function TypingBubble() {
  return (
    <div className="animate-msg-pop flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm bg-card px-4 py-3 shadow-sm">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot size-1.5 rounded-full bg-[var(--txt-3)]" />
      ))}
    </div>
  );
}

function Bubble({ step }: { step: ChatStep }) {
  if (step.from === "system") {
    return (
      <div className="animate-msg-pop mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
        <CalendarCheck className="size-3.5 text-[var(--accent-strong)]" />
        {step.text}
      </div>
    );
  }
  if (step.from === "patient" && "audio" in step) {
    return (
      <div className="animate-msg-pop ml-auto flex w-fit items-center gap-2.5 rounded-2xl rounded-br-sm bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-foreground shadow-sm">
        <Mic className="size-4 shrink-0 text-[var(--accent-strong)]" />
        <AudioWave />
        <span className="tabular text-[11px] text-muted-foreground">0:06</span>
      </div>
    );
  }
  if (step.from === "patient") {
    return (
      <div className="animate-msg-pop ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
        {step.text}
      </div>
    );
  }
  return (
    <div className="animate-msg-pop w-fit max-w-[75%] rounded-2xl rounded-bl-sm bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
      {step.text}
    </div>
  );
}

function SideButton({ className }: { className: string }) {
  return (
    <span
      className={`absolute rounded-[3px] bg-[linear-gradient(90deg,#2c2f33,#55585d,#2c2f33)] ${className}`}
      aria-hidden
    />
  );
}

export function PhoneChat() {
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(script.length);
      return;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms));
      });

    (async () => {
      while (!cancelled) {
        setVisible(0);
        setTyping(false);
        await wait(900);
        for (let i = 0; i < script.length && !cancelled; i++) {
          if (script[i].from === "ai") {
            setTyping(true);
            await wait(1400);
            setTyping(false);
          }
          setVisible(i + 1);
          await wait(script[i].from === "system" ? 1000 : 1300);
        }
        await wait(4500);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        className="absolute -inset-14 rounded-full bg-[var(--accent-glow)] opacity-60 blur-3xl"
        aria-hidden
      />

      <FloatingChip
        icon={Sparkles}
        label="Responde 24 horas por dia"
        className="animate-float -left-24 top-28"
      />
      <FloatingChip
        icon={BellRing}
        label="Lembrete automático"
        className="animate-float-slow -right-20 top-[73%]"
      />
      <FloatingChip
        icon={CalendarCheck}
        label="Agenda no Google Calendar"
        className="animate-float -bottom-2 -left-16"
      />

      {/* Ground shadow */}
      <div
        className="absolute -bottom-10 left-1/2 h-12 w-[72%] -translate-x-1/2 rounded-[100%] bg-black/30 blur-2xl"
        aria-hidden
      />

      {/* iPhone */}
      <div className="relative transition-transform duration-700 ease-out lg:[transform:perspective(1600px)_rotateY(-9deg)_rotateX(2.5deg)_rotate(1.5deg)] lg:hover:[transform:perspective(1600px)]">
        {/* Titanium band */}
        <div className="relative rounded-[3.1rem] bg-[linear-gradient(150deg,#4d5156_0%,#212428_22%,#5a5e64_50%,#1c1e22_78%,#43474c_100%)] p-[3px] shadow-[0_34px_90px_rgba(15,23,20,0.35),0_10px_28px_rgba(15,23,20,0.22)]">
          <SideButton className="-left-[5px] top-[116px] h-8 w-[5px]" />
          <SideButton className="-left-[5px] top-[168px] h-14 w-[5px]" />
          <SideButton className="-left-[5px] top-[236px] h-14 w-[5px]" />
          <SideButton className="-right-[5px] top-[190px] h-20 w-[5px]" />

          {/* Black bezel */}
          <div className="rounded-[2.95rem] bg-[#050607] p-[10px]">
            {/* Screen */}
            <div className="relative flex h-[672px] flex-col overflow-hidden rounded-[2.4rem] bg-[var(--bg-1)]">
              {/* Glass reflection */}
              <div
                className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(112deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.05)_20%,transparent_42%)]"
                aria-hidden
              />

              {/* Status bar + dynamic island */}
              <div className="relative flex items-center justify-between px-7 pb-1 pt-3.5">
                <span className="tabular text-[12px] font-semibold text-foreground">21:47</span>
                <span className="absolute left-1/2 top-2.5 flex h-[26px] w-[92px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2.5">
                  <span className="size-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#3b4a5a_0%,#0c1118_55%,#000_100%)] ring-1 ring-[#1a1d22]" />
                </span>
                <span className="flex items-center gap-1.5 text-foreground">
                  <Wifi className="size-3.5" />
                  <span className="inline-block h-[10px] w-[18px] rounded-[3px] border border-current p-[1.5px] opacity-90">
                    <span className="block h-full w-[70%] rounded-[1px] bg-current" />
                  </span>
                </span>
              </div>

              {/* Conversation header */}
              <div className="flex items-center gap-2.5 border-b border-border bg-card px-4 py-2.5">
                <span className="bg-brand flex size-9 shrink-0 items-center justify-center rounded-full text-white">
                  <BotMessageSquare className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    Clínica Bem-Estar
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-[var(--accent-strong)]">
                    <span className="size-1.5 animate-pulse rounded-full bg-current" />
                    Ana responde em segundos
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3.5 text-muted-foreground">
                  <Video className="size-4" />
                  <Phone className="size-3.5" />
                </div>
              </div>

              {/* Messages */}
              <div className="chat-bg flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3.5 pb-3 pt-4">
                {script.slice(0, visible).map((step, i) => (
                  <Bubble key={i} step={step} />
                ))}
                {typing && <TypingBubble />}
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-2 border-t border-border bg-card px-3 pb-5 pt-2.5">
                <div className="flex-1 rounded-full bg-[var(--bg-1)] px-4 py-2 text-[13px] text-muted-foreground">
                  Mensagem
                </div>
                <span className="bg-brand flex size-9 shrink-0 items-center justify-center rounded-full text-white">
                  <SendHorizonal className="size-4" />
                </span>
              </div>

              {/* Home indicator */}
              <span
                className="absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-foreground/70"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>

      {/* Handwritten annotation */}
      <div className="absolute -bottom-24 right-0 hidden rotate-[-4deg] lg:block">
        <svg
          width="74"
          height="46"
          viewBox="0 0 74 46"
          fill="none"
          className="absolute -left-16 -top-6 text-[var(--txt-3)]"
          aria-hidden
        >
          <path
            d="M70 42C48 40 20 32 10 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M4 14L10 5L18 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <p className="font-hand max-w-[190px] text-xl leading-tight text-[var(--txt-2)]">
          conversa real da IA, sem ninguém da equipe digitando
        </p>
      </div>
    </div>
  );
}
