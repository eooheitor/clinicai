import "./config";
import express from "express";
import { config } from "./config";
import { evolutionWebhookHandler } from "./webhooks/evolution.webhook";
import { mercadopagoWebhookHandler } from "./webhooks/mercadopago.webhook";
import { adminRouter } from "./routes/admin.routes";
import { authRouter } from "./routes/auth.routes";
import { panelRouter } from "./routes/panel.routes";
import { prisma } from "./database/prisma";
import { startReminderJob } from "./jobs/reminder.job";
import { startTrialExpiryJob } from "./jobs/trial-expiry.job";

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.WEB_URL || "http://localhost:3002");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (_req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/webhook/:instance", evolutionWebhookHandler);
app.post("/webhooks/mercadopago", mercadopagoWebhookHandler);
app.use("/admin", adminRouter);
app.use("/auth", authRouter);
app.use("/panel", panelRouter);

async function main() {
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

  startReminderJob();
  startTrialExpiryJob();

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
