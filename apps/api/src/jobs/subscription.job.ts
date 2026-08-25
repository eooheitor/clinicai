import { prisma } from "../database/prisma";
import { emailService } from "../services/email.service";
import { mpService } from "../services/mp.service";
import { config } from "../config";

export async function runSubscriptionRenewalJob() {
  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);

  // 1. Suspender assinaturas ACTIVE vencidas
  const expired = await prisma.clinic.findMany({
    where: { subscriptionStatus: "ACTIVE", subscriptionExpiresAt: { lt: now } },
    select: { id: true, name: true, users: { where: { role: "CLINIC" }, select: { email: true, name: true }, take: 1 } },
  });

  for (const clinic of expired) {
    await prisma.clinic.update({ where: { id: clinic.id }, data: { subscriptionStatus: "SUSPENDED" } });
    const owner = clinic.users[0];
    if (owner) {
      try {
        await emailService.sendSuspensionEmail({ to: owner.email, name: owner.name, clinicName: clinic.name });
      } catch (err) {
        console.error(`Erro ao enviar email de suspensão (assinatura vencida) para ${owner.email}:`, err);
      }
    }
    console.log(`⏱️  Assinatura vencida: ${clinic.name} → SUSPENDED`);
  }

  // 2. Avisar assinaturas ACTIVE que vencem em até 3 dias, com link de renovação
  if (!config.MP_ACCESS_TOKEN) {
    console.warn("⏱️  MP_ACCESS_TOKEN não configurado — pulando envio de lembretes de renovação");
    return;
  }

  const expiringSoon = await prisma.clinic.findMany({
    where: { subscriptionStatus: "ACTIVE", subscriptionExpiresAt: { gte: now, lte: threeDaysLater } },
    select: { id: true, name: true, subscriptionExpiresAt: true, users: { where: { role: "CLINIC" }, select: { email: true, name: true }, take: 1 } },
  });

  for (const clinic of expiringSoon) {
    const owner = clinic.users[0];
    if (!owner || !clinic.subscriptionExpiresAt) continue;
    try {
      const checkoutUrl = await mpService.createCheckout({
        clinicId: clinic.id,
        clinicName: clinic.name,
        backUrl: `${config.WEB_URL}/dashboard`,
      });
      await emailService.sendRenewalEmail({
        to: owner.email,
        name: owner.name,
        clinicName: clinic.name,
        checkoutUrl,
        expiresAt: clinic.subscriptionExpiresAt,
      });
    } catch (err) {
      console.error(`Erro ao processar lembrete de renovação para ${clinic.name}:`, err);
    }
  }
}

export function startSubscriptionRenewalJob() {
  console.log("⏱️  Subscription renewal job iniciado (intervalo: 24h)");
  runSubscriptionRenewalJob();
  // 24h, não 1h — para não reenviar o mesmo e-mail de renovação repetidas vezes
  // durante a janela de 3 dias antes do vencimento.
  setInterval(runSubscriptionRenewalJob, 24 * 60 * 60 * 1000);
}
