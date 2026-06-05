// ⚠️  DESATIVADO — substituído por openai.service.ts
// Para reverter para Claude:
//   1. Em evolution.webhook.ts: descomente a linha do claudeService e remova o import do openaiService
//   2. Restaure ANTHROPIC_API_KEY no .env (remova OPENAI_API_KEY ou mantenha os dois)
import Anthropic from "@anthropic-ai/sdk";
import { Clinic } from "@prisma/client";
import { config } from "../config";
import { calendarService } from "./calendar.service";
import { prisma } from "../database/prisma";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const anthropic = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
  timeout: 30_000, // 30s por chamada HTTP
  maxRetries: 0,   // sem retry automático — o webhook tem timeout próprio
});

type Message = { role: "user" | "assistant"; content: string };

type BufferItem =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string; caption?: string }
  | { type: "document"; base64: string; mimeType: string; filename?: string };

const schedulingTools: Anthropic.Tool[] = [
  {
    name: "check_availability",
    description:
      "Verifica os horários disponíveis para agendamento nos próximos dias. Use esta ferramenta quando o paciente quiser agendar ou souber quais horários estão disponíveis.",
    input_schema: {
      type: "object" as const,
      properties: {
        days_ahead: {
          type: "number",
          description: "Quantos dias à frente verificar (padrão: 7)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_appointment",
    description:
      "Agenda uma consulta/procedimento para o paciente. Use somente após confirmar nome, serviço e horário com o paciente.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_name: {
          type: "string",
          description: "Nome completo do paciente",
        },
        patient_phone: {
          type: "string",
          description: "Telefone do paciente (com DDD)",
        },
        service: {
          type: "string",
          description: "Serviço ou procedimento escolhido",
        },
        slot_start: {
          type: "string",
          description: "Data/hora de início no formato ISO 8601",
        },
        slot_end: {
          type: "string",
          description: "Data/hora de fim no formato ISO 8601",
        },
        notes: {
          type: "string",
          description: "Observações adicionais (opcional)",
        },
      },
      required: ["patient_name", "patient_phone", "service", "slot_start", "slot_end"],
    },
  },
  {
    name: "get_patient_appointments",
    description:
      "Busca os agendamentos futuros de um paciente pelo telefone.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_phone: {
          type: "string",
          description: "Telefone do paciente",
        },
      },
      required: ["patient_phone"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancela um agendamento existente do paciente.",
    input_schema: {
      type: "object" as const,
      properties: {
        appointment_id: {
          type: "string",
          description: "ID do agendamento a cancelar",
        },
      },
      required: ["appointment_id"],
    },
  },
];

const triagemTools: Anthropic.Tool[] = [
  {
    name: "complete_triagem",
    description:
      "Conclui a triagem do cliente após coletar todas as informações necessárias. Use esta ferramenta quando tiver coletado: nome completo, contato, descrição detalhada do caso e todos os documentos/informações solicitados.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "Resumo do caso coletado durante a triagem",
        },
      },
      required: ["summary"],
    },
  },
];

// Normaliza telefone: remove tudo que não é dígito, pega os últimos 11 dígitos
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-11); // últimos 11 dígitos (DDD + número)
}

async function findAppointmentsByPhone(clinicId: string, phone: string) {
  const normalized = normalizePhone(phone);
  const all = await prisma.appointment.findMany({
    where: { clinicId, scheduledAt: { gte: new Date() }, status: "CONFIRMED" },
    orderBy: { scheduledAt: "asc" },
  });
  // Busca flexível: compara últimos 11 dígitos de ambos os lados
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
      if (slots.length === 0) {
        return "Nenhum horário disponível nos próximos dias.";
      }
      const list = slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
      return `Horários disponíveis:\n${list}`;
    }

    case "create_appointment": {
      const slots = await calendarService.getAvailableSlots(clinic, 14);
      const chosen = slots.find((s) => s.start === toolInput.slot_start);

      // Usa o contactPhone real se disponível, senão usa o que o usuário informou
      const patientPhone = contactPhone
        ? contactPhone.replace(/\D/g, "").slice(-11)
        : (toolInput.patient_phone as string).replace(/\D/g, "");

      // Google Calendar é opcional — falha não impede o agendamento
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
      // Usa o contactPhone real da conversa (mais confiável que o que o usuário digitou)
      const phoneToSearch = contactPhone || (toolInput.patient_phone as string);
      const appointments = await findAppointmentsByPhone(clinic.id, phoneToSearch);

      if (appointments.length === 0) {
        return "Nenhum agendamento futuro encontrado para este paciente.";
      }

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
        where: {
          id: toolInput.appointment_id as string,
          clinicId: clinic.id,
        },
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

function buildSystemPrompt(clinic: Clinic, contactPhone: string, contactName?: string | null, objective?: string): string {
  const services = clinic.services as string[];
  const requiredDocs = (clinic as any).requiredDocs as string[];
  const companyInfo = (clinic as any).companyInfo as string | null | undefined;
  const workingHours = clinic.workingHours as Record<
    string,
    { start: string; end: string } | null
  >;

  const dayNames: Record<string, string> = {
    monday: "Segunda",
    tuesday: "Terça",
    wednesday: "Quarta",
    thursday: "Quinta",
    friday: "Sexta",
    saturday: "Sábado",
    sunday: "Domingo",
  };

  const hoursText = Object.entries(workingHours)
    .filter(([, h]) => h !== null)
    .map(([day, h]) => `${dayNames[day]}: ${h!.start} às ${h!.end}`)
    .join(", ");

  const servicesText =
    services.length > 0 ? services.join(", ") : "consultas e procedimentos";

  const base =
    clinic.systemPrompt ||
    `Você é ${clinic.aiName}, atendente virtual da ${clinic.name}.
Você é atenciosa, profissional e educada.
Responda sempre em português brasileiro.
Não invente informações — se não souber algo, diga que vai verificar com a equipe.`;

  const docsText = requiredDocs?.length > 0
    ? `\n- Documentos necessários antes de agendar: ${requiredDocs.join(", ")}. Solicite que o cliente envie esses documentos pelo WhatsApp. Considere o documento como entregue quando o cliente enviar uma imagem, um PDF ou uma mensagem dizendo que enviou. Só prossiga com o agendamento após isso.`
    : "";

  const companyInfoText = companyInfo?.trim()
    ? `\n\nINFORMAÇÕES ADICIONAIS DO NEGÓCIO:\n${companyInfo.trim()}`
    : "";

  const isTriagem = (objective ?? (clinic as any).aiObjective ?? "agendamento") === "triagem";

  const objectiveInstructions = isTriagem
    ? `
INSTRUÇÕES DE TRIAGEM:
Seu objetivo é coletar as informações necessárias do cliente para que um profissional possa analisar o caso e entrar em contato.
Siga esta ordem durante a conversa:
1. Cumprimente e pergunte como pode ajudar.
2. Colete as informações necessárias de forma natural, uma ou duas por vez — não dispare um formulário de uma vez.
3. Informações obrigatórias a coletar: nome completo, telefone de contato (se diferente do WhatsApp atual), descrição detalhada do caso ou necessidade.${docsText ? `\n4. Solicite também os seguintes documentos ou informações adicionais: ${requiredDocs.join(", ")}.` : ""}
${docsText ? "5." : "4."} Quando tiver coletado tudo, use a ferramenta complete_triagem com um resumo do caso.
${docsText ? "6." : "5."} Após acionar a ferramenta, informe ao cliente: "Obrigado! Suas informações foram registradas. Em breve um de nossos profissionais entrará em contato para dar sequência ao seu caso."
- Não invente informações nem tome decisões sobre o caso — apenas colete e registre.
- Se o cliente perguntar sobre prazos ou valores, diga que o profissional responsável esclarecerá esses detalhes no contato.`
    : `
INSTRUÇÕES DE AGENDAMENTO:
- Quando o cliente quiser agendar: use check_availability para buscar os horários disponíveis.
- Apresente as opções agrupadas por dia, indicando manhã e tarde separadamente. Exemplo: "Quinta-feira, 10 de abril — manhã: 08h, 08h30, 09h | tarde: 13h, 14h, 15h". Não liste todos os horários de uma vez, filtre os mais relevantes.
- Se o cliente pedir horários à tarde especificamente, mostre apenas os horários a partir das 12h.
- Se o cliente pedir horários de manhã, mostre apenas os horários até as 12h.
- Confirme nome completo, serviço e horário com o cliente antes de criar o agendamento.
- Se houver documentos necessários configurados, siga esta ordem obrigatória: (1) apresente os horários disponíveis, (2) combine o horário com o cliente, (3) solicite o envio dos documentos, (4) somente após o cliente confirmar o envio, crie o agendamento.
- Após agendar, confirme os detalhes de forma objetiva.
- Para cancelamentos: use get_patient_appointments para localizar o agendamento e cancel_appointment para cancelar.`;

  return `${base}

INFORMAÇÕES DA CLÍNICA:
- Nome: ${clinic.name}
- Serviços: ${servicesText}
- Horário de atendimento: ${hoursText || "a definir"}${isTriagem ? "" : docsText}${companyInfoText}

REGRAS DE COMPORTAMENTO (seguir sempre, sem exceção):
- Nunca use emojis em nenhuma mensagem, em nenhuma situação.
- Converse de forma natural e humana. Se a pessoa mandar apenas "Olá" ou "Boa tarde", responda cumprimentando e pergunte em que pode ajudar — não tente agendar ou oferecer serviços imediatamente.
- Acompanhe o ritmo da conversa: respostas curtas para mensagens curtas, respostas mais completas quando necessário.
- Mantenha um tom profissional e cordial, sem ser excessivamente formal nem informal demais.
- Nunca use asteriscos, hashtags ou qualquer outra marcação de texto. Escreva em texto simples.
${objectiveInstructions}

CONTEXTO DO CLIENTE ATUAL:
- Número de WhatsApp: ${contactPhone.replace("@s.whatsapp.net", "").replace(/@.*/, "")}
${contactName ? `- Nome: ${contactName}` : "- Nome: ainda não informado"}
Use essas informações diretamente ao chamar ferramentas — não peça o telefone se já está aqui.

Data e hora atual: ${dayjs().locale("pt-br").format("dddd, D [de] MMMM [de] YYYY [às] HH:mm")}`;
}

function buildUserContent(items: BufferItem[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];

  for (const item of items) {
    if (item.type === "image") {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: item.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: item.base64,
        },
      });
      if (item.caption?.trim()) {
        blocks.push({ type: "text", text: item.caption });
      }
    } else if (item.type === "document") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: item.base64,
        },
      } as Anthropic.ContentBlockParam);
    } else {
      blocks.push({ type: "text", text: item.text });
    }
  }

  return blocks;
}

export const claudeService = {
  async respond(
    clinic: Clinic,
    history: Message[],
    items: BufferItem[],
    contactPhone: string,
    contactName?: string | null,
    conversationId?: string
  ): Promise<string> {
    const userContent = buildUserContent(items);

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    const objective = (clinic as any).aiObjective ?? "agendamento";
    const tools = objective === "triagem" ? triagemTools : schedulingTools;
    const systemPrompt = buildSystemPrompt(clinic, contactPhone, contactName, objective);

    let response = await anthropic.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // Loop de tool use
    while (response.stop_reason === "tool_use") {
      const assistantMessage: Anthropic.MessageParam = {
        role: "assistant",
        content: response.content,
      };

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const result = await handleToolCall(
          clinic,
          block.name,
          block.input as Record<string, unknown>,
          contactPhone,
          conversationId
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }

      messages.push(assistantMessage);
      messages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: config.CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : "";
  },
};
