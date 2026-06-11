import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../database/prisma";
import { authMiddleware } from "../middleware/auth.middleware";
import { evolutionService } from "../services/evolution.service";
import { emailService } from "../services/email.service";
import { config } from "../config";

const router = Router();

function clinicResponse(clinic: any) {
  if (!clinic) return null;
  return {
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    subscriptionStatus: clinic.subscriptionStatus,
    trialEndsAt: clinic.trialEndsAt,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.clinic.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${Math.random().toString(36).substring(2, 6)}`;
  }
  throw new Error("Não foi possível gerar um slug único");
}

// Login
router.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email ou senha inválidos" });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { clinic: true },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  if (!user.active) {
    res.status(403).json({ error: "Usuário desativado. Entre em contato com o administrador." });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, clinicId: user.clinicId, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clinic: clinicResponse(user.clinic),
    },
  });
});

// Registro público — cria clínica + usuário + instância WhatsApp automaticamente
router.post("/register", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).refine((v) => v.trim().split(/\s+/).length >= 2, {
      message: "Informe nome e sobrenome.",
    }),
    email: z.string().email(),
    password: z.string().min(6).refine((v) => /[^A-Za-z0-9]/.test(v), {
      message: "A senha deve conter ao menos um caractere especial.",
    }),
    clinicName: z.string().min(2),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password, clinicName } = parsed.data;

  const emailExists = await prisma.user.findUnique({ where: { email } });
  if (emailExists) {
    res.status(409).json({ error: "Este email já está cadastrado" });
    return;
  }

  const baseSlug = slugify(clinicName);
  const slug = await uniqueSlug(baseSlug);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + config.TRIAL_DAYS);

  const clinic = await prisma.clinic.create({
    data: {
      name: clinicName,
      slug,
      evolutionInstance: slug,
      subscriptionStatus: "TRIAL",
      trialEndsAt,
    },
  });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "CLINIC", clinicId: clinic.id },
  });

  // Cria instância WhatsApp — erro não aborta o cadastro
  try {
    await evolutionService.createInstance(slug);
    const webhookUrl = `${process.env.APP_URL}/webhook/${slug}`;
    await evolutionService.setWebhook(slug, webhookUrl);
  } catch (err) {
    console.warn("⚠️  Erro ao criar instância Evolution no registro:", err);
  }

  // Envia email de boas-vindas — erro não aborta o cadastro
  try {
    await emailService.sendWelcomeEmail({
      to: email,
      name,
      clinicName,
      trialDays: config.TRIAL_DAYS,
    });
  } catch (err) {
    console.warn("⚠️  Erro ao enviar email de boas-vindas:", err);
  }

  const token = jwt.sign(
    { userId: user.id, clinicId: clinic.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clinic: clinicResponse(clinic),
    },
  });
});

// Dados do usuário logado
router.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    include: { clinic: true },
  });
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clinic: clinicResponse(user.clinic),
  });
});

// Atualizar próprio perfil
router.patch("/me", authMiddleware, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { name, email, currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

  if (newPassword) {
    if (!currentPassword) { res.status(400).json({ error: "Senha atual obrigatória" }); return; }
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) { res.status(400).json({ error: "Senha atual incorreta" }); return; }
  }

  if (email && email !== user.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) { res.status(409).json({ error: "Email já está em uso" }); return; }
  }

  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (newPassword) data.password = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({ where: { id: req.auth!.userId }, data });
  res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
});

// Criar usuário master (protegido por ADMIN_SECRET)
router.post("/setup", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const schema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) { res.status(409).json({ error: "Email já cadastrado" }); return; }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, password: hashed, role: "MASTER" },
  });

  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

export { router as authRouter };
