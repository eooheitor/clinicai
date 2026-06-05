import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../database/prisma";
import { evolutionService } from "../services/evolution.service";
import { calendarService } from "../services/calendar.service";
import { config } from "../config";
import { z } from "zod";
import { sendReminders } from "../jobs/reminder.job";

const router = Router();

// Middleware de autenticação simples por API key
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-key"];
  if (key !== config.ADMIN_SECRET) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  next();
}

// Callback do Google OAuth — sem autenticação (redirect do browser)
// state pode ser "clinicId" (master) ou "settings:clinicId" (página de configurações)
router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) { res.status(400).send("Parâmetros inválidos"); return; }

  const stateStr = state as string;
  const fromSettings = stateStr.startsWith("settings:");
  const clinicId = fromSettings ? stateStr.slice("settings:".length) : stateStr;

  try {
    const tokens = await calendarService.getTokensFromCode(code as string);
    if (tokens.refresh_token) {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: { googleRefreshToken: tokens.refresh_token },
      });
    }
    const redirect = fromSettings
      ? `${process.env.WEB_URL}/configuracao?calendarConnected=1`
      : `${process.env.WEB_URL}/master?calendarConnected=${clinicId}`;
    res.redirect(redirect);
  } catch (err) {
    const redirect = fromSettings
      ? `${process.env.WEB_URL}/configuracao?calendarError=1`
      : `${process.env.WEB_URL}/master?calendarError=1`;
    res.redirect(redirect);
  }
});

router.use(adminAuth);

// ── Clínicas ────────────────────────────────────────────────────────────────

const createClinicSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  evolutionInstance: z.string().min(2),
  aiName: z.string().default("Ana"),
  systemPrompt: z.string().optional(),
  services: z.array(z.string()).default([]),
  workingHours: z
    .record(
      z.union([
        z.object({ start: z.string(), end: z.string() }),
        z.null(),
      ])
    )
    .default({}),
  appointmentDuration: z.number().default(60),
  calendarId: z.string().optional(),
});

// Listar todas as clínicas
router.get("/clinics", async (_req, res) => {
  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      evolutionInstance: true,
      active: true,
      aiName: true,
      services: true,
      workingHours: true,
      appointmentDuration: true,
      calendarId: true,
      createdAt: true,
    },
  });
  res.json(clinics);
});

// Criar nova clínica + instância na Evolution API
router.post("/clinics", async (req, res) => {
  const parsed = createClinicSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  const clinic = await prisma.clinic.create({
    data: {
      name: data.name,
      slug: data.slug,
      evolutionInstance: data.evolutionInstance,
      aiName: data.aiName,
      systemPrompt: data.systemPrompt ?? "",
      services: data.services,
      workingHours: data.workingHours,
      appointmentDuration: data.appointmentDuration,
      calendarId: data.calendarId,
    },
  });

  // Cria instância na Evolution API
  try {
    await evolutionService.createInstance(data.evolutionInstance);

    // Configura webhook
    const webhookUrl = `${process.env.APP_URL}/webhook/${data.evolutionInstance}`;
    await evolutionService.setWebhook(data.evolutionInstance, webhookUrl);
  } catch (err) {
    console.error("Erro ao criar instância Evolution:", err);
  }

  res.status(201).json(clinic);
});

// Buscar clínica por ID
router.get("/clinics/:id", async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id } });
  if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }
  res.json(clinic);
});

// Atualizar clínica
router.patch("/clinics/:id", async (req, res) => {
  const clinic = await prisma.clinic.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(clinic);
});

// Ativar/desativar clínica
router.patch("/clinics/:id/toggle", async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id } });
  if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }

  const updated = await prisma.clinic.update({
    where: { id: req.params.id },
    data: { active: !clinic.active },
  });
  res.json(updated);
});

// ── WhatsApp / Evolution ─────────────────────────────────────────────────────

// Pegar QR Code para conectar WhatsApp
router.get("/clinics/:id/qrcode", async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id } });
  if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }

  const qr = await evolutionService.getQRCode(clinic.evolutionInstance);
  res.json(qr);
});

// Status da conexão WhatsApp
router.get("/clinics/:id/status", async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id } });
  if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }

  const status = await evolutionService.getInstanceStatus(clinic.evolutionInstance);
  res.json(status);
});

// ── Google Calendar OAuth ────────────────────────────────────────────────────

// Gera URL de autorização do Google (inclui clinicId no state)
router.get("/clinics/:id/google/auth-url", async (req, res) => {
  const url = calendarService.getAuthUrl(req.params.id);
  res.json({ url });
});


// Salvar Calendar ID
router.patch("/clinics/:id/calendar-id", async (req, res) => {
  const { calendarId } = req.body;
  if (!calendarId) { res.status(400).json({ error: "calendarId obrigatório" }); return; }
  const clinic = await prisma.clinic.update({
    where: { id: req.params.id },
    data: { calendarId },
  });
  res.json({ ok: true, calendarId: clinic.calendarId });
});

// ── Agendamentos ─────────────────────────────────────────────────────────────

router.get("/clinics/:id/appointments", async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId: req.params.id,
      scheduledAt: { gte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
  });
  res.json(appointments);
});

// ── Conversas ────────────────────────────────────────────────────────────────

router.get("/clinics/:id/conversations", async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { clinicId: req.params.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  res.json(conversations);
});

// Reativar IA (sair do modo humano)
router.patch("/conversations/:id/reativar-ia", async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
  });
  if (!conversation) { res.status(404).json({ error: "Conversa não encontrada" }); return; }

  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { humanMode: false, humanModeActivatedAt: null },
  });
  res.json({ ok: true, humanMode: updated.humanMode });
});

// Listar conversas em modo humano (aguardando atendente)
router.get("/clinics/:id/conversations/humano", async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { clinicId: req.params.id, humanMode: true },
    orderBy: { humanModeActivatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  res.json(conversations);
});

// ── Jobs ─────────────────────────────────────────────────────────────────────

router.post("/reminders/trigger", async (_req, res) => {
  await sendReminders();
  res.json({ ok: true, message: "Job de lembretes executado" });
});

export { router as adminRouter };
