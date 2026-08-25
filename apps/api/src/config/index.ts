import { config as dotenv } from "dotenv";
import path from "path";

// Carrega o .env único da raiz do monorepo
dotenv({ path: path.resolve(__dirname, "../../../../.env") });
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string(),

  EVOLUTION_API_URL: z.string(),
  EVOLUTION_API_KEY: z.string(),

  // OpenAI (ativo)
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.string().default("gpt-4o"),

  // Anthropic / Claude (desativado — mantido para rollback)
  ANTHROPIC_API_KEY: z.string().default(""),
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-6"),

  ADMIN_SECRET: z.string(),
  JWT_SECRET: z.string(),
  WEB_URL: z.string().default("http://localhost:3001"),
  RESEND_API_KEY: z.string().default(""),
  TRIAL_DAYS: z.coerce.number().default(3),
  FROM_EMAIL: z.string().default("onboarding@resend.dev"),
  MP_ACCESS_TOKEN: z.string().default(""),
  MP_WEBHOOK_SECRET: z.string().default(""),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1, "obrigatório — autentica callbacks da Evolution em /webhook/:instance"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
