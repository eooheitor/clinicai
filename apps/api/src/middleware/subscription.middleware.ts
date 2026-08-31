import { Request, Response, NextFunction } from "express";
import { prisma } from "../database/prisma";
import { isSubscriptionBlocked } from "../utils/subscription";

export async function subscriptionMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role === "MASTER") return next();
  if (!req.auth.clinicId) return next();

  const clinic = await prisma.clinic.findUnique({
    where: { id: req.auth.clinicId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });

  if (!clinic) { res.status(403).json({ error: "subscription_required", status: "UNKNOWN" }); return; }

  if (isSubscriptionBlocked(clinic)) {
    res.status(403).json({ error: "subscription_required", status: clinic.subscriptionStatus });
    return;
  }

  next();
}
