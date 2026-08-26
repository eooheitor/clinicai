import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../config", () => ({
  config: { EVOLUTION_WEBHOOK_SECRET: "correct-secret" },
}));

vi.mock("../database/prisma", () => ({
  prisma: { clinic: { findUnique: vi.fn() }, conversation: { update: vi.fn() } },
}));

vi.mock("../services/conversation.service", () => ({
  conversationService: { getOrCreate: vi.fn(), addMessage: vi.fn(), getHistory: vi.fn(), updateContactName: vi.fn() },
}));

vi.mock("../services/openai.service", () => ({
  openaiService: { respond: vi.fn() },
}));

vi.mock("../services/evolution.service", () => ({
  evolutionService: { resolveJid: vi.fn(), sendText: vi.fn(), sendTyping: vi.fn(), getMediaBase64: vi.fn() },
}));

vi.mock("../services/transcription.service", () => ({
  transcriptionService: { transcribe: vi.fn() },
}));

import { evolutionWebhookHandler } from "./evolution.webhook";
import { prisma } from "../database/prisma";

function makeReq(overrides: { token?: string; body?: any } = {}) {
  return {
    query: overrides.token !== undefined ? { token: overrides.token } : {},
    body: overrides.body ?? {},
    params: { instance: "clinica-teste" },
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((payload: any) => { res.body = payload; return res; });
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("evolutionWebhookHandler — validação de token", () => {
  test("rejeita quando nenhum token é informado", async () => {
    const req = makeReq();
    const res = makeRes();

    await evolutionWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ ok: false });
  });

  test("rejeita quando o token é diferente do configurado", async () => {
    const req = makeReq({ token: "token-errado" });
    const res = makeRes();

    await evolutionWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ ok: false });
  });

  test("rejeita um token que é apenas um prefixo do secret correto", async () => {
    const req = makeReq({ token: "correct-secre" });
    const res = makeRes();

    await evolutionWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("não processa o corpo da requisição quando o token é inválido", async () => {
    const req = makeReq({ token: "token-errado", body: { event: "messages.upsert" } });
    const res = makeRes();

    await evolutionWebhookHandler(req, res);

    expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
  });

  test("aceita o token correto e responde 200 imediatamente", async () => {
    const req = makeReq({ token: "correct-secret", body: { event: "connection.update" } });
    const res = makeRes();

    await evolutionWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({ ok: true });
  });
});
