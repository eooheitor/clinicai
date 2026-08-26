import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../database/prisma", () => ({
  prisma: {
    clinic: {
      findUnique: vi.fn(),
    },
  },
}));

import { subscriptionMiddleware } from "./subscription.middleware";
import { prisma } from "../database/prisma";

function makeRes() {
  const res: any = {};
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((payload: any) => { res.body = payload; return res; });
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("libera acesso para MASTER sem consultar o banco", async () => {
  const req: any = { auth: { userId: "u", clinicId: null, role: "MASTER" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
});

test("libera acesso quando não há payload de autenticação", async () => {
  const req: any = {};
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
});

test("libera acesso quando o CLINIC não tem clinicId associado", async () => {
  const req: any = { auth: { userId: "u", clinicId: null, role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
});

test("bloqueia quando a clínica referenciada não existe mais", async () => {
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce(null);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.body).toEqual({ error: "subscription_required", status: "UNKNOWN" });
  expect(next).not.toHaveBeenCalled();
});

test("consulta a clínica pelo clinicId do token, não pela URL", async () => {
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce({ subscriptionStatus: "ACTIVE", trialEndsAt: null } as any);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(prisma.clinic.findUnique).toHaveBeenCalledWith({
    where: { id: "clinic-1" },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });
});

test("libera acesso quando a assinatura está ACTIVE", async () => {
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce({ subscriptionStatus: "ACTIVE", trialEndsAt: null } as any);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});

test("bloqueia quando a assinatura está SUSPENDED", async () => {
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce({ subscriptionStatus: "SUSPENDED", trialEndsAt: null } as any);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.body).toEqual({ error: "subscription_required", status: "SUSPENDED" });
  expect(next).not.toHaveBeenCalled();
});

test("bloqueia quando a assinatura está CANCELLED", async () => {
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce({ subscriptionStatus: "CANCELLED", trialEndsAt: null } as any);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.body).toEqual({ error: "subscription_required", status: "CANCELLED" });
  expect(next).not.toHaveBeenCalled();
});

test("libera acesso durante o TRIAL enquanto trialEndsAt está no futuro", async () => {
  const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce({ subscriptionStatus: "TRIAL", trialEndsAt } as any);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});

test("bloqueia quando o TRIAL já passou de trialEndsAt", async () => {
  const trialEndsAt = new Date(Date.now() - 1000);
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce({ subscriptionStatus: "TRIAL", trialEndsAt } as any);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.body).toEqual({ error: "subscription_required", status: "TRIAL" });
  expect(next).not.toHaveBeenCalled();
});

test("libera acesso quando o status é TRIAL mas trialEndsAt ainda não foi definido", async () => {
  vi.mocked(prisma.clinic.findUnique).mockResolvedValueOnce({ subscriptionStatus: "TRIAL", trialEndsAt: null } as any);
  const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
  const res = makeRes();
  const next = vi.fn();

  await subscriptionMiddleware(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});
