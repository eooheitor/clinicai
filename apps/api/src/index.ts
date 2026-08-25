import "./config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { evolutionWebhookHandler } from "./webhooks/evolution.webhook";
import { mercadopagoWebhookHandler } from "./webhooks/mercadopago.webhook";
import { adminRouter } from "./routes/admin.routes";
import { authRouter } from "./routes/auth.routes";
import { panelRouter } from "./routes/panel.routes";
import { prisma } from "./database/prisma";
import { startReminderJob } from "./jobs/reminder.job";
import { startTrialExpiryJob } from "./jobs/trial-expiry.job";
import { startSubscriptionRenewalJob } from "./jobs/subscription.job";

const app = express();

// Confia no primeiro proxy (Traefik em produção) para req.ip real — necessário para rate limit funcionar
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "5mb" }));
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.WEB_URL || "http://localhost:3000");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (_req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de cadastros atingido. Tente novamente em 1 hora." },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/webhook/:instance", evolutionWebhookHandler);
app.post("/webhooks/mercadopago", mercadopagoWebhookHandler);
app.use("/admin", adminRouter);
app.post("/auth/login", authLimiter);
app.post("/auth/register", registerLimiter);
app.use("/auth", authRouter);
app.use("/panel", panelRouter);

async function main() {
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

  startReminderJob();
  startTrialExpiryJob();
  startSubscriptionRenewalJob();

  app.listen(config.PORT, "0.0.0.0", () => {
    console.log(`🚀 FluxoIA Zap API rodando na porta ${config.PORT}`);
    console.log(`   Auth:  /auth/login`);
    console.log(`   Panel: /panel/*`);
  });
}

main().catch((err) => {
  console.error("Erro ao iniciar servidor:", err);
  process.exit(1);
});
