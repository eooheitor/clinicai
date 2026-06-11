import { Router } from "express";
import { prisma } from "../database/prisma";
import { authMiddleware, requireMaster } from "../middleware/auth.middleware";
import { evolutionService } from "../services/evolution.service";
import { calendarService } from "../services/calendar.service";
import { mpService } from "../services/mp.service";
import { config } from "../config";
import { documentService } from "../services/document.service";
import { uploadSingleFile } from "../middleware/upload.middleware";
import presetRoutes from "./preset.routes";
import bcrypt from "bcryptjs";
import { z } from "zod";

const MAX_DOCS_PER_CLINIC = 5;

const router = Router();
router.use(authMiddleware);
router.use("/master/presets", requireMaster, presetRoutes);

// Helper: garante que o usuário só acessa sua própria clínica
function clinicId(req: any): string {
  if (req.auth.role === "MASTER" && req.params.clinicId) return req.params.clinicId;
  if (req.auth.clinicId) return req.auth.clinicId;
  throw new Error("Sem clínica associada");
}

// ── Métricas do dashboard ────────────────────────────────────────────────────

router.get("/dashboard", async (req, res) => {
  try {
    const cId = clinicId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [
      totalConversations,
      activeToday,
      humanModeCount,
      triagemCount,
      appointmentsToday,
      appointmentsWeek,
      totalPatients,
    ] = await Promise.all([
      prisma.conversation.count({ where: { clinicId: cId } }),
      prisma.conversation.count({ where: { clinicId: cId, updatedAt: { gte: today } } }),
      prisma.conversation.count({ where: { clinicId: cId, humanMode: true } }),
      prisma.conversation.count({ where: { clinicId: cId, triagemCompleta: true } }),
      prisma.appointment.count({
        where: { clinicId: cId, scheduledAt: { gte: today, lt: tomorrow }, status: "CONFIRMED" },
      }),
      prisma.appointment.count({
        where: {
          clinicId: cId,
          scheduledAt: { gte: today, lte: new Date(Date.now() + 7 * 864e5) },
          status: "CONFIRMED",
        },
      }),
      prisma.conversation.count({ where: { clinicId: cId } }),
    ]);

    // Mensagens por dia nos últimos 7 dias
    const last7 = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT DATE(m."createdAt") as day, COUNT(*) as count
      FROM messages m
      JOIN conversations c ON c.id = m."conversationId"
      WHERE c."clinicId" = ${cId}
        AND m."createdAt" >= NOW() - INTERVAL '7 days'
        AND m.role = 'user'
      GROUP BY DATE(m."createdAt")
      ORDER BY day ASC
    `;

    // Serviços mais agendados (CONFIRMED)
    const topServicesRaw = await prisma.appointment.groupBy({
      by: ["service"],
      where: { clinicId: cId, status: "CONFIRMED" },
      _count: { service: true },
      orderBy: { _count: { service: "desc" } },
      take: 5,
    });
    const topServices = topServicesRaw.map((r) => ({ service: r.service, count: r._count.service }));

    res.json({
      totalConversations,
      activeToday,
      humanModeCount,
      triagemCount,
      appointmentsToday,
      appointmentsWeek,
      totalPatients,
      topServices,
      messagesLast7Days: last7.map((r) => ({ day: r.day, count: Number(r.count) })),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Configuração da clínica / IA ─────────────────────────────────────────────

router.get("/settings", async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId(req) },
      select: {
        id: true, name: true, slug: true, phone: true,
        aiName: true, clientInstructions: true, services: true, requiredDocs: true, companyInfo: true,
        workingHours: true, appointmentDuration: true,
        adminPhone: true, active: true, evolutionInstance: true, aiObjective: true,
        calendarId: true, googleRefreshToken: true, reminderEnabled: true,
        preset: { select: { id: true, name: true, description: true } },
      },
    });
    if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }
    res.json(clinic);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/settings", async (req, res) => {
  try {
    const allowed = ["name", "aiName", "clientInstructions", "services", "requiredDocs",
                     "workingHours", "appointmentDuration", "adminPhone", "phone", "companyInfo", "aiObjective", "reminderEnabled"];
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const clinic = await prisma.clinic.update({ where: { id: clinicId(req) }, data });
    res.json(clinic);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ── Documentos de conhecimento da própria clínica ────────────────────────────

router.get("/documents", async (req, res) => {
  try {
    const docs = await prisma.knowledgeDocument.findMany({
      where: { clinicId: clinicId(req) },
      select: { id: true, filename: true, mimeType: true, sizeBytes: true, charCount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/documents", uploadSingleFile, async (req, res) => {
  try { await uploadClinicDocument(clinicId(req), req, res); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/documents/:docId", async (req, res) => {
  try {
    const { count } = await prisma.knowledgeDocument.deleteMany({
      where: { id: req.params.docId as string, clinicId: clinicId(req) },
    });
    if (count === 0) { res.status(404).json({ error: "Documento não encontrado" }); return; }
    res.status(204).end();
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ── Google Calendar (configurações da própria clínica) ───────────────────────

router.get("/settings/google/auth-url", async (req, res) => {
  const id = clinicId(req);
  const url = calendarService.getAuthUrl(`settings:${id}`);
  res.json({ url });
});

router.patch("/settings/calendar-id", async (req, res) => {
  const { calendarId: cid } = req.body;
  if (!cid) { res.status(400).json({ error: "calendarId obrigatório" }); return; }
  await prisma.clinic.update({ where: { id: clinicId(req) }, data: { calendarId: cid } });
  res.json({ ok: true });
});

// ── WhatsApp ─────────────────────────────────────────────────────────────────

router.get("/whatsapp/status", async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId(req) } });
    if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }
    const status = await evolutionService.getInstanceStatus(clinic.evolutionInstance);
    res.json({
      state: status?.instance?.state ?? status?.state ?? "close",
      instanceName: clinic.evolutionInstance,
    });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/whatsapp/qrcode", async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId(req) } });
    if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }
    const qr = await evolutionService.getQRCode(clinic.evolutionInstance);
    res.json({ qrcode: qr.base64 ?? qr.qrcode ?? qr.code ?? null });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ── Conversas ────────────────────────────────────────────────────────────────

router.get("/conversations", async (req, res) => {
  try {
    const { search, humanMode, triagemCompleta, page = "1" } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where: any = { clinicId: clinicId(req) };
    if (humanMode === "true") where.humanMode = true;
    if (triagemCompleta === "true") where.triagemCompleta = true;
    if (search) {
      where.OR = [
        { contactName: { contains: String(search), mode: "insensitive" } },
        { contactPhone: { contains: String(search) } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({ conversations, total, pages: Math.ceil(total / take) });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, clinicId: clinicId(req) },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) { res.status(404).json({ error: "Não encontrada" }); return; }
    res.json(conv);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/conversations/:id/send", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) { res.status(400).json({ error: "Mensagem vazia" }); return; }

    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, clinicId: clinicId(req) },
      include: { clinic: true },
    });
    if (!conv) { res.status(404).json({ error: "Conversa não encontrada" }); return; }

    await prisma.message.create({
      data: { conversationId: conv.id, role: "assistant", content: text.trim() },
    });

    await evolutionService.sendText(conv.clinic.evolutionInstance, conv.contactPhone, text.trim());
    res.json({ ok: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/conversations/:id/concluir-triagem", async (req, res) => {
  try {
    await prisma.conversation.updateMany({
      where: { id: req.params.id, clinicId: clinicId(req) },
      data: { triagemCompleta: true, triagemCompletaAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/conversations/:id/pausar-ia", async (req, res) => {
  try {
    await prisma.conversation.updateMany({
      where: { id: req.params.id, clinicId: clinicId(req) },
      data: { humanMode: true, humanModeActivatedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/conversations/:id/reativar-ia", async (req, res) => {
  try {
    await prisma.conversation.updateMany({
      where: { id: req.params.id, clinicId: clinicId(req) },
      data: { humanMode: false, humanModeActivatedAt: null },
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ── Clientes / Pacientes ─────────────────────────────────────────────────────

router.get("/patients", async (req, res) => {
  try {
    const { search, page = "1" } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where: any = { clinicId: clinicId(req) };
    if (search) {
      where.OR = [
        { contactPhone: { contains: String(search) } },
        { contactName: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        include: {
          _count: { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({ patients, total, pages: Math.ceil(total / take) });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ── Agendamentos ─────────────────────────────────────────────────────────────

router.get("/appointments", async (req, res) => {
  try {
    const { status, page = "1", from, to, phone } = req.query;

    const where: any = { clinicId: clinicId(req) };
    if (status) where.status = String(status).toUpperCase();
    if (phone) where.patientPhone = String(phone);
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(String(from));
      if (to) where.scheduledAt.lt = new Date(String(to));
    } else if (!phone) {
      // Comportamento padrão (retrocompatível): apenas futuros
      where.scheduledAt = { gte: new Date() };
    }

    // Em consultas por intervalo/telefone retornamos tudo; senão paginamos
    const ranged = Boolean(from || to || phone);
    const take = ranged ? 1000 : 20;
    const skip = ranged ? 0 : (Number(page) - 1) * take;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        take,
        skip,
      }),
      prisma.appointment.count({ where }),
    ]);

    res.json({ appointments, total, pages: Math.ceil(total / take) });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Criação manual de agendamento (painel)
router.post("/appointments", async (req, res) => {
  try {
    const cId = clinicId(req);
    const { patientName, patientPhone, service, scheduledAt, durationMinutes, notes } = req.body;
    if (!patientName || !service || !scheduledAt) {
      res.status(400).json({ error: "Nome, serviço e data/hora são obrigatórios" });
      return;
    }
    const start = new Date(scheduledAt);
    if (isNaN(start.getTime())) {
      res.status(400).json({ error: "Data/hora inválida" });
      return;
    }
    const clinic = await prisma.clinic.findUnique({ where: { id: cId } });
    if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }

    const duration = Number(durationMinutes) || clinic.appointmentDuration || 60;
    const end = new Date(start.getTime() + duration * 60_000);
    const phone = patientPhone ? String(patientPhone).replace(/\D/g, "") : "";

    let event: Awaited<ReturnType<typeof calendarService.createAppointment>> = null;
    try {
      event = await calendarService.createAppointment(clinic, {
        patientName: String(patientName),
        patientPhone: phone,
        service: String(service),
        start: start.toISOString(),
        end: end.toISOString(),
        notes: notes ? String(notes) : undefined,
      });
    } catch (err: any) {
      console.warn(`⚠️  Agendamento manual salvo sem evento no Calendar: ${err?.message}`);
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: cId,
        patientName: String(patientName),
        patientPhone: phone,
        service: String(service),
        notes: notes ? String(notes) : null,
        scheduledAt: start,
        endsAt: end,
        googleEventId: event?.id ?? undefined,
      },
    });
    res.status(201).json(appointment);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/appointments/:id/cancel", async (req, res) => {
  try {
    await prisma.appointment.updateMany({
      where: { id: req.params.id, clinicId: clinicId(req) },
      data: { status: "CANCELLED" },
    });
    res.json({ ok: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ── Master: gerenciar clínicas e usuários ────────────────────────────────────

router.post("/master/clinics", requireMaster, async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    evolutionInstance: z.string().min(2),
    presetId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const clinic = await prisma.clinic.create({ data: parsed.data });

    try {
      await evolutionService.createInstance(parsed.data.evolutionInstance);
      const webhookUrl = `${process.env.APP_URL}/webhook/${parsed.data.evolutionInstance}`;
      await evolutionService.setWebhook(parsed.data.evolutionInstance, webhookUrl);
    } catch (err) {
      console.error("Erro ao criar instância Evolution:", err);
    }

    res.status(201).json(clinic);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/master/clinics", requireMaster, async (_req, res) => {
  const clinics = await prisma.clinic.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { conversations: true, appointments: true } } },
  });
  res.json(clinics);
});

router.patch("/master/clinics/:clinicId", requireMaster, async (req, res) => {
  const { active } = req.body;
  if (typeof active !== "boolean") { res.status(400).json({ error: "Campo 'active' obrigatório" }); return; }
  const clinic = await prisma.clinic.update({ where: { id: req.params.clinicId }, data: { active } });
  res.json(clinic);
});

router.delete("/master/clinics/:clinicId", requireMaster, async (req, res) => {
  const { clinicId } = req.params;
  await prisma.$transaction(async (tx) => {
    const conversations = await tx.conversation.findMany({ where: { clinicId }, select: { id: true } });
    const conversationIds = conversations.map((c) => c.id);
    await tx.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
    await tx.appointment.deleteMany({ where: { clinicId } });
    await tx.conversation.deleteMany({ where: { clinicId } });
    await tx.user.deleteMany({ where: { clinicId } });
    await tx.clinic.delete({ where: { id: clinicId } });
  });
  res.status(204).end();
});

router.post("/master/clinics/:clinicId/users", requireMaster, async (req, res) => {
  const schema = z.object({ name: z.string(), email: z.string().email(), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: "CLINIC",
      clinicId: req.params.clinicId,
    },
  });
  res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

// ── Master: configuração de IA por clínica ──────────────────────────────────

const docSelect = {
  id: true, filename: true, mimeType: true, sizeBytes: true, charCount: true, createdAt: true,
} as const;

router.get("/master/clinics/:clinicId/ai-config", requireMaster, async (req, res) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id: req.params.clinicId as string },
    select: {
      id: true, name: true, presetId: true, adminPrompt: true, clientInstructions: true,
      preset: { select: { id: true, name: true } },
      documents: { select: docSelect, orderBy: { createdAt: "desc" } },
    },
  });
  if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }
  res.json(clinic);
});

router.patch("/master/clinics/:clinicId/ai-config", requireMaster, async (req, res) => {
  const schema = z.object({
    presetId: z.string().nullable().optional(),
    adminPrompt: z.string().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    if (parsed.data.presetId) {
      const preset = await prisma.preset.findUnique({ where: { id: parsed.data.presetId } });
      if (!preset) { res.status(404).json({ error: "Preset não encontrado" }); return; }
    }
    const clinic = await prisma.clinic.update({
      where: { id: req.params.clinicId as string },
      data: parsed.data,
      select: { id: true, presetId: true, adminPrompt: true },
    });
    res.json(clinic);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

async function uploadClinicDocument(cId: string, req: any, res: any) {
  const count = await prisma.knowledgeDocument.count({ where: { clinicId: cId } });
  if (count >= MAX_DOCS_PER_CLINIC) {
    res.status(400).json({ error: `Limite de ${MAX_DOCS_PER_CLINIC} documentos por clínica atingido.` });
    return;
  }
  const doc = await documentService.ingest(req.file!, { clinicId: cId, uploadedBy: req.auth?.userId });
  res.status(201).json(doc);
}

router.post("/master/clinics/:clinicId/documents", requireMaster, uploadSingleFile, async (req, res) => {
  try { await uploadClinicDocument(req.params.clinicId as string, req, res); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/master/clinics/:clinicId/documents/:docId", requireMaster, async (req, res) => {
  const { count } = await prisma.knowledgeDocument.deleteMany({
    where: { id: req.params.docId as string, clinicId: req.params.clinicId as string },
  });
  if (count === 0) { res.status(404).json({ error: "Documento não encontrado" }); return; }
  res.status(204).end();
});

router.get("/master/clinics/:clinicId/google/auth-url", requireMaster, async (req, res) => {
  const url = calendarService.getAuthUrl(req.params.clinicId);
  res.json({ url });
});

router.patch("/master/clinics/:clinicId/calendar-id", requireMaster, async (req, res) => {
  const { calendarId } = req.body;
  if (!calendarId) { res.status(400).json({ error: "calendarId obrigatório" }); return; }
  await prisma.clinic.update({ where: { id: req.params.clinicId }, data: { calendarId } });
  res.json({ ok: true });
});

router.get("/master/users", requireMaster, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true, active: true, createdAt: true,
      clinic: { select: { id: true, name: true, slug: true } },
    },
  });
  res.json(users);
});

router.patch("/master/users/:userId", requireMaster, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    active: z.boolean().optional(),
    newPassword: z.string().min(6).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!target) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  if (parsed.data.email && parsed.data.email !== target.email) {
    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) { res.status(409).json({ error: "Email já está em uso" }); return; }
  }

  const data: any = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.email !== undefined) data.email = parsed.data.email;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.newPassword) data.password = await bcrypt.hash(parsed.data.newPassword, 10);

  const updated = await prisma.user.update({ where: { id: req.params.userId }, data });
  res.json({ id: updated.id, name: updated.name, email: updated.email, active: updated.active });
});

router.delete("/master/users/:userId", requireMaster, async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!target) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  if (target.id === req.auth!.userId) { res.status(400).json({ error: "Não é possível excluir a si mesmo" }); return; }

  await prisma.user.delete({ where: { id: req.params.userId } });
  res.status(204).end();
});

// ── Assinatura / Mercado Pago ────────────────────────────────────────────────

router.get("/subscription", async (req, res) => {
  const cId = req.auth!.clinicId;
  if (!cId) { res.status(400).json({ error: "Sem clínica associada" }); return; }

  const clinic = await prisma.clinic.findUnique({
    where: { id: cId },
    select: { subscriptionStatus: true, trialEndsAt: true, mpSubscriptionId: true },
  });

  res.json(clinic);
});

router.post("/subscription/checkout", async (req, res) => {
  if (!config.MP_ACCESS_TOKEN) {
    res.status(503).json({ error: "Pagamentos ainda não configurados" });
    return;
  }

  const cId = req.auth!.clinicId;
  if (!cId) { res.status(400).json({ error: "Sem clínica associada" }); return; }

  const clinic = await prisma.clinic.findUnique({ where: { id: cId }, select: { name: true } });
  if (!clinic) { res.status(404).json({ error: "Clínica não encontrada" }); return; }

  try {
    const url = await mpService.createCheckout({
      clinicId: cId,
      clinicName: clinic.name,
      backUrl: `${config.WEB_URL}/dashboard`,
    });
    res.json({ url });
  } catch (err: any) {
    console.error("Erro ao criar checkout MP:", err);
    res.status(500).json({ error: "Erro ao gerar link de pagamento" });
  }
});

export { router as panelRouter };
