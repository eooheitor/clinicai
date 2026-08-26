import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../database/prisma", () => ({
  prisma: {
    clinic: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../services/email.service", () => ({
  emailService: {
    sendSuspensionEmail: vi.fn(),
    sendRenewalEmail: vi.fn(),
  },
}));

vi.mock("../services/mp.service", () => ({
  mpService: {
    createCheckout: vi.fn(),
  },
}));

vi.mock("../config", () => ({
  config: {
    MP_ACCESS_TOKEN: "test-mp-token",
    WEB_URL: "https://app.example.com",
  },
}));

import { runSubscriptionRenewalJob } from "./subscription.job";
import { prisma } from "../database/prisma";
import { emailService } from "../services/email.service";
import { mpService } from "../services/mp.service";
import { config } from "../config";

const EXPIRED_SELECT = {
  id: true,
  name: true,
  users: { where: { role: "CLINIC" }, select: { email: true, name: true }, take: 1 },
};

const EXPIRING_SOON_SELECT = {
  id: true,
  name: true,
  subscriptionExpiresAt: true,
  users: { where: { role: "CLINIC" }, select: { email: true, name: true }, take: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  (config as any).MP_ACCESS_TOKEN = "test-mp-token";
  (config as any).WEB_URL = "https://app.example.com";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runSubscriptionRenewalJob — suspensão de assinaturas vencidas", () => {
  test("suspende clínicas ACTIVE com assinatura vencida", async () => {
    vi.mocked(prisma.clinic.findMany)
      .mockResolvedValueOnce([
        { id: "clinic-1", name: "Clínica A", users: [{ email: "dono@a.com", name: "Dono A" }] },
      ] as any)
      .mockResolvedValueOnce([]);

    await runSubscriptionRenewalJob();

    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { subscriptionStatus: "SUSPENDED" },
    });
  });

  test("envia email de suspensão para o dono da clínica", async () => {
    vi.mocked(prisma.clinic.findMany)
      .mockResolvedValueOnce([
        { id: "clinic-1", name: "Clínica A", users: [{ email: "dono@a.com", name: "Dono A" }] },
      ] as any)
      .mockResolvedValueOnce([]);

    await runSubscriptionRenewalJob();

    expect(emailService.sendSuspensionEmail).toHaveBeenCalledWith({
      to: "dono@a.com",
      name: "Dono A",
      clinicName: "Clínica A",
    });
  });

  test("não envia email de suspensão quando a clínica não tem dono", async () => {
    vi.mocked(prisma.clinic.findMany)
      .mockResolvedValueOnce([{ id: "clinic-1", name: "Clínica A", users: [] }] as any)
      .mockResolvedValueOnce([]);

    await runSubscriptionRenewalJob();

    expect(emailService.sendSuspensionEmail).not.toHaveBeenCalled();
    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { subscriptionStatus: "SUSPENDED" },
    });
  });

  test("continua suspendendo as demais clínicas quando o envio de um email falha", async () => {
    vi.mocked(emailService.sendSuspensionEmail).mockRejectedValueOnce(new Error("Resend indisponível"));
    vi.mocked(prisma.clinic.findMany)
      .mockResolvedValueOnce([
        { id: "clinic-1", name: "Clínica A", users: [{ email: "a@a.com", name: "A" }] },
        { id: "clinic-2", name: "Clínica B", users: [{ email: "b@b.com", name: "B" }] },
      ] as any)
      .mockResolvedValueOnce([]);

    await expect(runSubscriptionRenewalJob()).resolves.not.toThrow();

    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-1" },
      data: { subscriptionStatus: "SUSPENDED" },
    });
    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: "clinic-2" },
      data: { subscriptionStatus: "SUSPENDED" },
    });
  });

  test("consulta apenas clínicas ACTIVE com subscriptionExpiresAt anterior a agora", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
    vi.mocked(prisma.clinic.findMany).mockResolvedValue([]);

    await runSubscriptionRenewalJob();

    expect(prisma.clinic.findMany).toHaveBeenNthCalledWith(1, {
      where: { subscriptionStatus: "ACTIVE", subscriptionExpiresAt: { lt: new Date("2026-06-10T12:00:00.000Z") } },
      select: EXPIRED_SELECT,
    });
  });
});

describe("runSubscriptionRenewalJob — lembretes de renovação", () => {
  test("pula lembretes de renovação inteiramente quando MP_ACCESS_TOKEN não está configurado", async () => {
    (config as any).MP_ACCESS_TOKEN = "";
    vi.mocked(prisma.clinic.findMany).mockResolvedValueOnce([]);

    await runSubscriptionRenewalJob();

    expect(prisma.clinic.findMany).toHaveBeenCalledTimes(1);
    expect(mpService.createCheckout).not.toHaveBeenCalled();
    expect(emailService.sendRenewalEmail).not.toHaveBeenCalled();
  });

  test("consulta clínicas ACTIVE que vencem dentro dos próximos 3 dias", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
    vi.mocked(prisma.clinic.findMany).mockResolvedValue([]);

    await runSubscriptionRenewalJob();

    expect(prisma.clinic.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: { gte: new Date("2026-06-10T12:00:00.000Z"), lte: new Date("2026-06-13T12:00:00.000Z") },
      },
      select: EXPIRING_SOON_SELECT,
    });
  });

  test("cria checkout e envia email de renovação para clínicas vencendo em breve", async () => {
    const expiresAt = new Date("2026-06-12T12:00:00.000Z");
    vi.mocked(prisma.clinic.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "clinic-1", name: "Clínica A", subscriptionExpiresAt: expiresAt, users: [{ email: "dono@a.com", name: "Dono A" }] },
      ] as any);
    vi.mocked(mpService.createCheckout).mockResolvedValueOnce("https://mp.example.com/checkout/123");

    await runSubscriptionRenewalJob();

    expect(mpService.createCheckout).toHaveBeenCalledWith({
      clinicId: "clinic-1",
      clinicName: "Clínica A",
      backUrl: "https://app.example.com/dashboard",
    });
    expect(emailService.sendRenewalEmail).toHaveBeenCalledWith({
      to: "dono@a.com",
      name: "Dono A",
      clinicName: "Clínica A",
      checkoutUrl: "https://mp.example.com/checkout/123",
      expiresAt,
    });
  });

  test("pula clínicas sem dono ao enviar lembretes de renovação", async () => {
    vi.mocked(prisma.clinic.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "clinic-1", name: "Clínica A", subscriptionExpiresAt: new Date("2026-06-12T12:00:00.000Z"), users: [] },
      ] as any);

    await runSubscriptionRenewalJob();

    expect(mpService.createCheckout).not.toHaveBeenCalled();
    expect(emailService.sendRenewalEmail).not.toHaveBeenCalled();
  });

  test("continua processando as demais clínicas quando a criação do checkout falha para uma delas", async () => {
    vi.mocked(prisma.clinic.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "clinic-1", name: "Clínica A", subscriptionExpiresAt: new Date("2026-06-12T12:00:00.000Z"), users: [{ email: "a@a.com", name: "A" }] },
        { id: "clinic-2", name: "Clínica B", subscriptionExpiresAt: new Date("2026-06-13T12:00:00.000Z"), users: [{ email: "b@b.com", name: "B" }] },
      ] as any);
    vi.mocked(mpService.createCheckout)
      .mockRejectedValueOnce(new Error("MP fora do ar"))
      .mockResolvedValueOnce("https://mp.example.com/checkout/456");

    await expect(runSubscriptionRenewalJob()).resolves.not.toThrow();

    expect(emailService.sendRenewalEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendRenewalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "b@b.com", clinicName: "Clínica B" })
    );
  });
});
