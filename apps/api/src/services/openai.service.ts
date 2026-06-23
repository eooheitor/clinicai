import OpenAI from "openai";
import { Clinic } from "@prisma/client";
import { config } from "../config";
import { calendarService } from "./calendar.service";
import { prisma } from "../database/prisma";
import { buildSystemPrompt, ClinicForPrompt } from "./prompt.builder";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

type Message = { role: "user" | "assistant"; content: string };

type BufferItem =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string; caption?: string }
  | { type: "document"; base64: string; mimeType: string; filename?: string };

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  timeout: 30_000,
  maxRetries: 0,
});

const schedulingTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "Verifica os horários disponíveis para agendamento nos próximos dias. Use esta ferramenta quando o paciente quiser agendar ou souber quais horários estão disponíveis.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: {
            type: "number",
            description: "Quantos dias à frente verificar (padrão: 7)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description:
        "Agenda uma consulta/procedimento para o paciente. Use somente após confirmar nome, serviço e horário com o paciente.",
      parameters: {
        type: "object",
        properties: {
          patient_name: { type: "string", description: "Nome completo do paciente" },
          patient_phone: { type: "string", description: "Telefone do paciente (com DDD)" },
          service: { type: "string", description: "Serviço ou procedimento escolhido" },
          slot_start: { type: "string", description: "Data/hora de início no formato ISO 8601" },
          slot_end: { type: "string", description: "Data/hora de fim no formato ISO 8601" },
          notes: { type: "string", description: "Observações adicionais (opcional)" },
        },
        required: ["patient_name", "patient_phone", "service", "slot_start", "slot_end"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patient_appointments",
      description: "Busca os agendamentos futuros de um paciente pelo telefone.",
      parameters: {
        type: "object",
        properties: {
          patient_phone: { type: "string", description: "Telefone do paciente" },
        },
        required: ["patient_phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description: "Cancela um agendamento existente do paciente.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "ID do agendamento a cancelar" },
        },
        required: ["appointment_id"],
      },
    },
  },
];

const triagemTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "complete_triagem",
      description:
        "Conclui a triagem do cliente após coletar todas as informações necessárias. Use esta ferramenta quando tiver coletado: nome completo, contato, descrição detalhada do caso e todos os documentos/informações solicitados.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Resumo do caso coletado durante a triagem" },
        },
        required: ["summary"],
      },
    },
  },
];

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-11);
}

// Um @lid (WhatsApp Privacy ID) não é um telefone real — seus dígitos não formam
// um número discável. Só consideramos utilizável um contactPhone sem domínio "@".
function usableContactPhone(contactPhone: string): string | null {
  if (!contactPhone || contactPhone.includes("@")) return null;
  return contactPhone;
}

async function findAppointmentsByPhone(clinicId: string, phone: string) {
  const normalized = normalizePhone(phone);
  const all = await prisma.appointment.findMany({
    where: { clinicId, scheduledAt: { gte: new Date() }, status: "CONFIRMED" },
    orderBy: { scheduledAt: "asc" },
  });
  return all.filter((a) => normalizePhone(a.patientPhone).endsWith(normalized) || normalized.endsWith(normalizePhone(a.patientPhone)));
}

async function handleToolCall(
  clinic: Clinic,
  toolName: string,
  toolInput: Record<string, unknown>,
  contactPhone: string,
  conversationId?: string
): Promise<string> {
  switch (toolName) {
    case "check_availability": {
      const daysAhead = (toolInput.days_ahead as number) ?? 7;
      const slots = await calendarService.getAvailableSlots(clinic, daysAhead);
      if (slots.length === 0) return "Nenhum horário disponível nos próximos dias.";
      const list = slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
      return `Horários disponíveis:\n${list}`;
    }

    case "create_appointment": {
      const slots = await calendarService.getAvailableSlots(clinic, 14);
      const chosen = slots.find((s) => s.start === toolInput.slot_start);

      const usablePhone = usableContactPhone(contactPhone);
      const patientPhone = usablePhone
        ? usablePhone.replace(/\D/g, "").slice(-11)
        : ((toolInput.patient_phone as string) ?? "").replace(/\D/g, "");

      let event: Awaited<ReturnType<typeof calendarService.createAppointment>> = null;
      try {
        event = await calendarService.createAppointment(clinic, {
          patientName: toolInput.patient_name as string,
          patientPhone,
          service: toolInput.service as string,
          start: toolInput.slot_start as string,
          end: toolInput.slot_end as string,
          notes: toolInput.notes as string | undefined,
        });
      } catch (err: any) {
        console.warn(`⚠️  Agendamento salvo no banco sem evento no Calendar: ${err?.message}`);
      }

      const appointment = await prisma.appointment.create({
        data: {
          clinicId: clinic.id,
          patientPhone,
          patientName: toolInput.patient_name as string,
          service: toolInput.service as string,
          notes: toolInput.notes as string | undefined,
          scheduledAt: new Date(toolInput.slot_start as string),
          endsAt: new Date(toolInput.slot_end as string),
          googleEventId: event?.id ?? undefined,
        },
      });

      const label =
        chosen?.label ??
        dayjs(toolInput.slot_start as string)
          .locale("pt-br")
          .format("dddd, D [de] MMMM [às] HH[h]mm");

      return `Agendamento confirmado! ID: ${appointment.id}\nPaciente: ${toolInput.patient_name}\nServiço: ${toolInput.service}\nData: ${label}`;
    }

    case "get_patient_appointments": {
      const phoneToSearch = usableContactPhone(contactPhone) || (toolInput.patient_phone as string);
      const appointments = await findAppointmentsByPhone(clinic.id, phoneToSearch);
      if (appointments.length === 0) return "Nenhum agendamento futuro encontrado para este paciente.";
      const list = appointments
        .map(
          (a) =>
            `ID: ${a.id}\nServiço: ${a.service}\nData: ${dayjs(a.scheduledAt)
              .locale("pt-br")
              .format("dddd, D [de] MMMM [às] HH[h]mm")}`
        )
        .join("\n\n");
      return `Agendamentos encontrados:\n\n${list}`;
    }

    case "cancel_appointment": {
      const appointment = await prisma.appointment.findFirst({
        where: { id: toolInput.appointment_id as string, clinicId: clinic.id },
      });
      if (!appointment) return "Agendamento não encontrado.";
      if (appointment.googleEventId) {
        await calendarService.cancelAppointment(clinic, appointment.googleEventId);
      }
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED" },
      });
      return `Agendamento cancelado com sucesso. ID: ${appointment.id}`;
    }

    case "complete_triagem": {
      if (conversationId) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { triagemCompleta: true, triagemCompletaAt: new Date() },
        });
      }
      return `Triagem concluída. Resumo registrado: ${toolInput.summary}`;
    }

    default:
      return "Ferramenta desconhecida.";
  }
}

function buildUserContent(items: BufferItem[]): OpenAI.Chat.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];

  for (const item of items) {
    if (item.type === "image") {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${item.mimeType};base64,${item.base64}` },
      });
      if (item.caption?.trim()) {
        parts.push({ type: "text", text: item.caption });
      }
    } else if (item.type === "document") {
      // OpenAI Chat Completions não suporta PDF direto — registramos como texto
      parts.push({ type: "text", text: `[Documento PDF recebido: ${item.filename ?? "arquivo.pdf"}]` });
    } else {
      parts.push({ type: "text", text: item.text });
    }
  }

  return parts;
}

export const openaiService = {
  async respond(
    clinic: ClinicForPrompt,
    history: Message[],
    items: BufferItem[],
    contactPhone: string,
    contactName?: string | null,
    conversationId?: string
  ): Promise<string> {
    const userContent = buildUserContent(items);
    const objective = (clinic as any).aiObjective ?? "agendamento";
    const tools = objective === "triagem" ? triagemTools : schedulingTools;
    const systemPrompt = buildSystemPrompt(clinic, contactPhone, contactName, objective);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: "user", content: userContent },
    ];

    let response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      max_tokens: 1024,
      tools,
      messages,
    });

    // Loop de tool calls
    while (response.choices[0].finish_reason === "tool_calls") {
      const assistantMessage = response.choices[0].message;
      messages.push(assistantMessage as OpenAI.Chat.ChatCompletionMessageParam);

      for (const toolCall of assistantMessage.tool_calls ?? []) {
        if (toolCall.type !== "function") continue;
        const toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        const result = await handleToolCall(
          clinic,
          toolCall.function.name,
          toolInput,
          contactPhone,
          conversationId
        );

        messages.push({
          role: "tool",
          content: result,
          tool_call_id: toolCall.id,
        });
      }

      response = await openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        max_tokens: 1024,
        tools,
        messages,
      });
    }

    return response.choices[0].message.content ?? "";
  },

  // Reescreve as instruções livres do cliente num texto claro e organizado, sem
  // alterar a intenção/fatos e sem introduzir regras de escopo ou comportamento de
  // área (isso é definido pelo preset). Lança em erro — o chamador faz fallback.
  async polishClientInstructions(raw: string, presetName?: string): Promise<string> {
    const areaContext = presetName
      ? `A clínica atua na área de ${presetName}; o comportamento e o escopo dessa área já são definidos separadamente, então NÃO os repita aqui.`
      : "";

    const response = await openai.chat.completions.create({
      model: config.OPENAI_MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `Você reescreve instruções de atendimento escritas por donos de clínica para uma IA atendente. Reescreva o texto do usuário de forma clara, organizada e objetiva, em português brasileiro.
Regras:
- Mantenha 100% da intenção, preferências e fatos do texto original.
- Não adicione regras, serviços, valores ou políticas que não estejam no texto.
- Não inclua escopo de atendimento, identidade da IA nem comportamento da área — isso é definido em outro lugar. ${areaContext}
- Não use marcação (sem asteriscos, hashtags ou markdown). Texto corrido ou frases curtas.
- Retorne apenas o texto reescrito, sem comentários.`,
        },
        { role: "user", content: raw },
      ],
    });

    const polished = response.choices[0].message.content?.trim();
    if (!polished) throw new Error("Polimento retornou vazio");
    return polished;
  },
};
