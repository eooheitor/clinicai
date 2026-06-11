import { prisma } from "../database/prisma";
import { emailService } from "../services/email.service";

export async function runTrialExpiryJob() {
  const now = new Date();
  const twoDaysLater = new Date(now);
  twoDaysLater.setDate(now.getDate() + 2);

  // 1. Suspender trials expirados
  const expired = await prisma.clinic.findMany({
    where: { subscriptionStatus: "TRIAL", trialEndsAt: { lt: now } },
    select: { id: true, name: true, users: { where: { role: "CLINIC" }, select: { email: true, name: true }, take: 1 } },
  });

  for (const clinic of expired) {
    await prisma.clinic.update({ where: { id: clinic.id }, data: { subscriptionStatus: "SUSPENDED" } });
    const owner = clinic.users[0];
    if (owner) {
      try {
        await emailService.sendSuspensionEmail({ to: owner.email, name: owner.name, clinicName: clinic.name });
      } catch (err) {
        console.error(`Erro ao enviar email de suspensão para ${owner.email}:`, err);
      }
    }
    console.log(`⏱️  Trial expirado: ${clinic.name} → SUSPENDED`);
  }

  // 2. Avisar trials que expiram em ≤ 2 dias
  const expiringSoon = await prisma.clinic.findMany({
    where: { subscriptionStatus: "TRIAL", trialEndsAt: { gte: now, lte: twoDaysLater } },
    select: { name: true, trialEndsAt: true, users: { where: { role: "CLINIC" }, select: { email: true, name: true }, take: 1 } },
  });

  for (const clinic of expiringSoon) {
    const owner = clinic.users[0];
    if (!owner || !clinic.trialEndsAt) continue;
    const daysLeft = Math.ceil((clinic.trialEndsAt.getTime() - now.getTime()) / 86_400_000);
    try {
      await emailService.sendTrialExpiringEmail({ to: owner.email, name: owner.name, clinicName: clinic.name, daysLeft });
    } catch (err) {
      console.error(`Erro ao enviar email de aviso para ${owner.email}:`, err);
    }
  }
}

export function startTrialExpiryJob() {
  console.log("⏱️  Trial expiry job iniciado (intervalo: 1h)");
  runTrialExpiryJob();
  setInterval(runTrialExpiryJob, 60 * 60 * 1000);
}
