import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../database/prisma";

export interface AuthPayload {
  userId: string;
  clinicId: string | null;
  role: "MASTER" | "CLINIC";
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace("Bearer ", "") ||
                req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function requireMaster(req: Request, res: Response, next: NextFunction): void {
  if (req.auth?.role !== "MASTER") {
    res.status(403).json({ error: "Acesso restrito" });
    return;
  }
  next();
}

// MASTER sempre passa — eles não têm subscription.
// CLINIC só passa se estiver em TRIAL válido ou ACTIVE.
// Consulta o banco em vez de confiar no JWT (token tem 7d de validade).
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.auth?.role === "MASTER") { next(); return; }

  const clinicId = req.auth?.clinicId;
  if (!clinicId) { res.status(403).json({ error: "Sem clínica associada." }); return; }

  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });

  if (!clinic) { res.status(403).json({ error: "Clínica não encontrada." }); return; }

  const { subscriptionStatus, trialEndsAt } = clinic;
  if (subscriptionStatus === "ACTIVE") { next(); return; }
  if (subscriptionStatus === "TRIAL" && trialEndsAt && trialEndsAt > new Date()) { next(); return; }

  res.status(403).json({ error: "Assinatura inativa. Renove para continuar." });
}
