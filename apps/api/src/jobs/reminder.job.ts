import { prisma } from "../database/prisma";
import { evolutionService } from "../services/evolution.service";
import { conversationService } from "../services/conversation.service";

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

function buildReminderMessage(
  aiName: string,
  patientName: string,
  service: string,
  scheduledAt: Date
): string {
  const date = scheduledAt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const time = scheduledAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  return (
    `Olá, ${patientName}! Aqui é ${aiName}.\n\n` +
    `Passando para confirmar seu agendamento:\n\n` +
    `📅 ${date} às ${time}\n` +
    `${service}\n\n` +
    `Caso precise cancelar ou reagendar, é só responder aqui.`
  );
}

async function sendReminders() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSent: false,
      scheduledAt: { gte: windowStart, lte: windowEnd },
    },
    include: { clinic: true },
  });

  if (appointments.length === 0) return;

  console.log(`⏰ Reminder job: ${appointments.length} lembrete(s) para enviar`);

  for (const appointment of appointments) {
    const { clinic, patientPhone, patientName, service, scheduledAt } = appointment;

    if (!clinic.active || !clinic.reminderEnabled) continue;

    try {
      const message = buildReminderMessage(
        clinic.aiName,
        patientName,
        service,
        scheduledAt
      );

      await evolutionService.sendText(clinic.evolutionInstance, patientPhone, message);

      const conversation = await conversationService.getOrCreate(
        clinic.id,
        patientPhone
      );
      await conversationService.addMessage(conversation.id, "assistant", message);

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true },
      });

      console.log(`✅ Lembrete enviado: ${patientName} (${patientPhone}) — ${clinic.name}`);
    } catch (err: any) {
      console.error(`❌ Falha ao enviar lembrete para ${patientName} (${patientPhone}):`, err.message);
    }
  }
}

export { sendReminders };

export function startReminderJob() {
  console.log("⏰ Reminder job iniciado (intervalo: 30min)");
  sendReminders();
  setInterval(sendReminders, INTERVAL_MS);
}
