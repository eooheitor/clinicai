import { Request, Response } from "express";
import { prisma } from "../database/prisma";
import { mpService } from "../services/mp.service";
import { emailService } from "../services/email.service";

export async function mercadopagoWebhookHandler(req: Request, res: Response) {
  res.sendStatus(200);

  const { type, data } = req.body;

  if (type !== "payment" || !data?.id) return;

  try {
    const payment = await mpService.getPayment(String(data.id));
    const clinicId = payment.external_reference;
    if (!clinicId) return;

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) return;

    if (payment.status === "approved") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          subscriptionStatus: "ACTIVE",
          subscriptionExpiresAt: expiresAt,
          mpSubscriptionId: String(data.id),
        },
      });

      console.log(`💳 Pagamento aprovado: ${clinic.name} → ACTIVE até ${expiresAt.toLocaleDateString("pt-BR")}`);

      const owner = await prisma.user.findFirst({
        where: { clinicId, role: "CLINIC" },
        select: { email: true, name: true },
      });
      if (owner) {
        emailService.sendPaymentConfirmationEmail({ to: owner.email, name: owner.name, clinicName: clinic.name, expiresAt })
          .catch((err) => console.error("Erro ao enviar email de confirmação:", err));
      }
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: { subscriptionStatus: "SUSPENDED" },
      });

      console.log(`💳 Pagamento recusado: ${clinic.name} → SUSPENDED`);
    }
  } catch (err) {
    console.error("Erro ao processar webhook MP:", err);
  }
}
