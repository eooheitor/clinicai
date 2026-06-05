import axios from "axios";
import http from "http";
import fs from "fs";
import path from "path";
import { config } from "../config";

// Diretório do store da Evolution — montado como volume em produção
const EVOLUTION_STORE_PATH = process.env.EVOLUTION_STORE_PATH ?? "/evolution/store";

// Keep-alive evita abrir nova conexão TCP a cada requisição
const keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });

const api = axios.create({
  baseURL: config.EVOLUTION_API_URL,
  headers: {
    apikey: config.EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  },
  timeout: 15_000,
  httpAgent: keepAliveAgent,
});

// Retry para erros de rede (socket hang up, ECONNRESET) — não retenta 4xx/5xx
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isNetworkError = !err.response && (
        err.code === "ECONNRESET" ||
        err.code === "ECONNABORTED" ||
        err.code === "ETIMEDOUT" ||
        err.message?.includes("socket hang up") ||
        err.message?.includes("timeout")
      );
      if (!isNetworkError || attempt === retries) throw err;
      console.warn(`⚠️  Evolution API: erro de rede (tentativa ${attempt}/${retries}), aguardando ${delayMs}ms...`);
      await new Promise((res) => setTimeout(res, delayMs * attempt));
    }
  }
  throw new Error("unreachable");
}

export const evolutionService = {
  async createInstance(instanceName: string) {
    const { data } = await api.post("/instance/create", {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    });
    return data;
  },

  async getQRCode(instanceName: string) {
    const { data } = await api.get(`/instance/connect/${instanceName}`);
    return data;
  },

  async getInstanceStatus(instanceName: string) {
    const { data } = await api.get(
      `/instance/connectionState/${instanceName}`
    );
    return data;
  },

  async deleteInstance(instanceName: string) {
    const { data } = await api.delete(`/instance/delete/${instanceName}`);
    return data;
  },

  async setWebhook(instanceName: string, webhookUrl: string) {
    const { data } = await api.post(`/webhook/set/${instanceName}`, {
      url: webhookUrl,
      byEvents: false,
      base64: false,
      enabled: true,
      events: [
        "MESSAGES_UPSERT",
        "CONNECTION_UPDATE",
      ],
    });
    return data;
  },

  // Lê contatos do store da Evolution diretamente do volume montado
  readContactsStore(instanceName: string): Array<{ id: string; profilePictureUrl: string | null }> {
    try {
      const dir = path.join(EVOLUTION_STORE_PATH, "contacts", instanceName);
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      return files.map((f) => {
        try {
          const raw = fs.readFileSync(path.join(dir, f), "utf8");
          return JSON.parse(raw);
        } catch { return null; }
      }).filter(Boolean);
    } catch { return []; }
  },

  // Resolve @lid → número real via correspondência de foto de perfil no store
  resolveLidToPhone(instanceName: string, lid: string): string | null {
    try {
      const contacts = this.readContactsStore(instanceName);
      const lidContact = contacts.find((c) => c.id === `${lid}@lid`);
      if (!lidContact?.profilePictureUrl) return null;

      // Extrai só o path da foto (sem query params que mudam)
      const picPath = (url: string) => url.split("?")[0];
      const lidPicPath = picPath(lidContact.profilePictureUrl);

      const match = contacts.find(
        (c) => c.id.includes("@s.whatsapp.net") &&
               c.profilePictureUrl &&
               picPath(c.profilePictureUrl) === lidPicPath
      );
      return match ? match.id.replace("@s.whatsapp.net", "") : null;
    } catch { return null; }
  },

  // Resolve o número real a partir de um JID (incluindo @lid)
  resolveJid(instanceName: string, remoteJid: string): string {
    if (remoteJid.includes("@lid")) {
      const lid = remoteJid.replace("@lid", "");
      const phone = this.resolveLidToPhone(instanceName, lid);
      if (phone) {
        console.log(`🔗 LID resolvido: ${remoteJid} → ${phone}`);
        return phone;
      }
      console.warn(`⚠️  Não foi possível resolver LID: ${remoteJid}`);
      return remoteJid; // retorna JID @lid completo — Evolution API (patched) aceita @lid
    }
    return remoteJid.replace(/@s\.whatsapp\.net|@g\.us/, "");
  },

  async sendText(instanceName: string, to: string, text: string) {
    const number = this.resolveJid(instanceName, to);
    const { data } = await withRetry(() =>
      api.post(`/message/sendText/${instanceName}`, {
        number,
        options: { delay: 1200 },
        textMessage: { text },
      })
    );
    return data;
  },

  async sendTyping(instanceName: string, to: string, durationMs = 2000) {
    const number = this.resolveJid(instanceName, to);
    await withRetry(() =>
      api.post(`/chat/sendPresence/${instanceName}`, {
        number,
        options: { presence: "composing", delay: durationMs },
      })
    ).catch(() => {}); // typing é best-effort
  },

  async getMediaBase64(instanceName: string, message: Record<string, unknown>) {
    const { data } = await api.post(
      `/chat/getBase64FromMediaMessage/${instanceName}`,
      { message }
    );
    return data as { base64: string; mimetype: string };
  },

  async listInstances() {
    const { data } = await api.get("/instance/fetchInstances");
    return data;
  },
};
