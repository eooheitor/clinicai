import { describe, test, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { authMiddleware, requireMaster, type AuthPayload } from "./auth.middleware";

const JWT_SECRET = "test-secret";

function makeRes() {
  const res: any = {};
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((payload: any) => { res.body = payload; return res; });
  return res;
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

describe("authMiddleware", () => {
  test("rejeita requisições sem token", () => {
    const req: any = { headers: {}, cookies: {} };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: "Não autenticado" });
    expect(next).not.toHaveBeenCalled();
  });

  test("aceita um Bearer token válido e anexa o payload decodificado em req.auth", () => {
    const payload: AuthPayload = { userId: "user-1", clinicId: "clinic-1", role: "CLINIC" };
    const token = jwt.sign(payload, JWT_SECRET);
    const req: any = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("usa o cookie token quando não há header Authorization", () => {
    const payload: AuthPayload = { userId: "user-2", clinicId: null, role: "MASTER" };
    const token = jwt.sign(payload, JWT_SECRET);
    const req: any = { headers: {}, cookies: { token } };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.auth).toMatchObject(payload);
  });

  test("prioriza o header Authorization sobre o cookie quando ambos existem", () => {
    const headerPayload: AuthPayload = { userId: "header-user", clinicId: "clinic-1", role: "CLINIC" };
    const cookiePayload: AuthPayload = { userId: "cookie-user", clinicId: "clinic-2", role: "CLINIC" };
    const req: any = {
      headers: { authorization: `Bearer ${jwt.sign(headerPayload, JWT_SECRET)}` },
      cookies: { token: jwt.sign(cookiePayload, JWT_SECRET) },
    };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(req.auth).toMatchObject(headerPayload);
  });

  test("rejeita um token malformado", () => {
    const req: any = { headers: { authorization: "Bearer not-a-real-token" }, cookies: {} };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: "Token inválido ou expirado" });
    expect(next).not.toHaveBeenCalled();
  });

  test("rejeita um token expirado", () => {
    const token = jwt.sign({ userId: "u", clinicId: "c", role: "CLINIC" }, JWT_SECRET, { expiresIn: -10 });
    const req: any = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejeita um token assinado com outro secret", () => {
    const token = jwt.sign({ userId: "u", clinicId: "c", role: "CLINIC" }, "wrong-secret");
    const req: any = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = makeRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireMaster", () => {
  test("libera acesso para role MASTER", () => {
    const req: any = { auth: { userId: "u", clinicId: null, role: "MASTER" } };
    const res = makeRes();
    const next = vi.fn();

    requireMaster(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("bloqueia role CLINIC", () => {
    const req: any = { auth: { userId: "u", clinicId: "clinic-1", role: "CLINIC" } };
    const res = makeRes();
    const next = vi.fn();

    requireMaster(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body).toEqual({ error: "Acesso restrito" });
    expect(next).not.toHaveBeenCalled();
  });

  test("bloqueia requisições sem payload de autenticação", () => {
    const req: any = {};
    const res = makeRes();
    const next = vi.fn();

    requireMaster(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
