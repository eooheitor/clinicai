import { Request, Response } from "express";
import { createHmac } from "crypto";
import { prisma } from "../database/prisma";
import { mpService } from "../services/mp.service";
import { emailService } from "../services/email.service";

function verifyMpSignature(req: Request): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Em dev sem secret configurado, deixa passar (mas loga aviso)
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn("⚠️  MP_WEBHOOK_SECRET não configurado — verificação ignorada em dev");
    return true;
  }

  const xSignature = req.headers["x-signature"] as string;
  const xRequestId = req.headers["x-request-id"] as string;
  if (!xSignature || !xRequestId) return false;

  // x-signature: "ts=<timestamp>,v1=<hmac>"
  const parts = Object.fromEntries(xSignature.split(",").map((p) => p.split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const dataId = req.body?.data?.id;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return expected === v1;
}

export async function mercadopagoWebhookHandler(req: Request, res: Response) {
  if (!verifyMpSignature(req)) {
    res.sendStatus(401);
    return;
  }

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
