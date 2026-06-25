import { Request, Response } from "express";
import { prisma } from "../database/prisma";
import { conversationService } from "../services/conversation.service";
import { openaiService } from "../services/openai.service";
// import { claudeService } from "../services/claude.service"; // rollback: trocar openaiService por claudeService
import { evolutionService } from "../services/evolution.service";
import { transcriptionService } from "../services/transcription.service";
import { Clinic } from "@prisma/client";

const BUFFER_DELAY_MS = 8_000;  // aguarda 8s por mais mensagens antes de processar
const AI_TIMEOUT_MS = 40_000;

// Palavras-chave que ativam transferência para humano
const HUMAN_KEYWORDS = [
  "falar com atendente",
  "falar com humano",
  "falar com pessoa",
  "quero atendente",
  "atendente humano",
  "atendente por favor",
  "quero falar com alguem",
  "quero falar com alguém",
  "pessoa real",
  "transferir",
  "falar com vocês",
];

function detectsHumanRequest(text: string): boolean {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return HUMAN_KEYWORDS.some((kw) =>
    normalized.includes(kw.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );
}

// ── Buffer de mensagens por usuário ──────────────────────────────────────────

type BufferItem =
  | { type: "text"; text: string }
  | { type: "image"; base64: string; mimeType: string; caption?: string }
  | { type: "document"; base64: string; mimeType: string; filename?: string };

interface PendingBuffer {
  instanceName: string;
  remoteJid: string;
  contactPhone: string;
  contactName: string | null;
  clinic: Clinic;
  conversationId: string;
  items: BufferItem[];
}

const pendingBuffers = new Map<string, PendingBuffer>();
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function flushBuffer(key: string): Promise<void> {
  const buf = pendingBuffers.get(key);
  if (!buf) return;
  pendingBuffers.delete(key);
  pendingTimers.delete(key);

  const { instanceName, remoteJid, contactPhone, contactName, clinic, conversationId, items } = buf;

  // Texto para o histórico
  const historyText = items
    .map((item) => {
      if (item.type === "text") return item.text;
      if (item.type === "document") return `[Documento PDF: ${item.filename ?? "arquivo.pdf"}]`;
      return item.caption ? `[Imagem: ${item.caption}]` : "[Imagem]";
    })
    .join("\n");

  console.log(`\n📨 [${instanceName}] ${contactPhone} (${items.length} item(s)): ${historyText}`);

  try {
    await conversationService.addMessage(conversationId, "user", historyText);
    const history = await conversationService.getHistory(conversationId);
    const historyWithoutLast = history.slice(0, -1);

    evolutionService.sendTyping(instanceName, remoteJid, 3000).catch(() => {});

    const reply = await Promise.race([
      openaiService.respond(clinic, historyWithoutLast, items, contactPhone, contactName, conversationId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), AI_TIMEOUT_MS)
      ),
    ]);

    if (!reply) return;

    await conversationService.addMessage(conversationId, "assistant", reply);
    console.log(`🤖 [${clinic.aiName}]: ${reply}\n`);

    await evolutionService.sendText(instanceName, remoteJid, reply).catch((err: Error) => {
      console.warn("⚠️  Falha ao enviar resposta WhatsApp:", err.message);
    });

  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error(`❌ [${instanceName}] ${contactPhone}: ${msg}`);
    if (msg === "timeout") {
      evolutionService.sendText(instanceName, remoteJid,
        "Desculpe, demorei para responder. Pode repetir sua mensagem?"
      ).catch(() => {});
    }
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function evolutionWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (secret) {
    const token = req.query.token as string | undefined;
    if (token !== secret) {
      res.status(401).json({ ok: false });
      return;
    }
  }

  res.status(200).json({ ok: true });

  const body = req.body;
  const instanceName = req.params.instance;

  if (body.event !== "messages.upsert") return;

  const messageData = body.data;
  if (messageData?.key?.fromMe) return;
  if (messageData?.key?.remoteJid?.includes("@g.us")) return;

  const rawJid = messageData?.key?.remoteJid as string;
  if (!rawJid) return;

  // Resolve @lid para o número real antes de qualquer coisa
  const contactPhone = evolutionService.resolveJid(instanceName, rawJid);
  // Se contactPhone contém "@" já é um JID completo (ex: @lid não resolvido); senão, adiciona domínio
  const remoteJid = contactPhone.includes("@")
    ? contactPhone
    : rawJid.includes("@lid")
      ? `${contactPhone}@s.whatsapp.net`
      : rawJid;
  if (!contactPhone) return;

  // ── Buscar clínica e conversa ─────────────────────────────────────────────
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { evolutionInstance: instanceName, active: true },
      include: { preset: { include: { documents: true } }, documents: true },
    });
    if (!clinic) return;

    const conversation = await conversationService.getOrCreate(clinic.id, contactPhone);

    const pushName = messageData?.pushName as string | undefined;
    if (pushName && !conversation.contactName) {
      conversationService.updateContactName(conversation.id, pushName).catch(() => {});
    }

    // ── Modo humano: passa direto, sem buffer ─────────────────────────────
    if (conversation.humanMode) {
      console.log(`👤 [${instanceName}] ${contactPhone} em modo humano — IA pausada`);
      return;
    }

    // ── Triagem já concluída: resposta fixa, sem chamar IA ───────────────
    if (conversation.triagemCompleta && (clinic as any).aiObjective === "triagem") {
      console.log(`📋 [${instanceName}] ${contactPhone} — triagem já concluída`);
      await evolutionService.sendText(instanceName, remoteJid,
        "Suas informações já foram registradas com sucesso. Em breve um de nossos profissionais entrará em contato para dar sequência ao seu caso. Caso precise de mais alguma coisa, estamos à disposição."
      ).catch(() => {});
      return;
    }

    // ── Extrair conteúdo da mensagem ─────────────────────────────────────
    let bufferItem: BufferItem | null = null;
    const msg = messageData?.message;

    if (msg?.conversation) {
      bufferItem = { type: "text", text: msg.conversation };
    } else if (msg?.extendedTextMessage?.text) {
      bufferItem = { type: "text", text: msg.extendedTextMessage.text };
    } else if (msg?.imageMessage) {
      try {
        console.log(`🖼️  [${instanceName}] ${contactPhone}: baixando imagem...`);
        const media = await evolutionService.getMediaBase64(instanceName, {
          key: messageData.key,
          message: msg,
        });
        const mimeType = media.mimetype || "image/jpeg";
        // Claude suporta: image/jpeg, image/png, image/gif, image/webp
        const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!supported.includes(mimeType)) {
          await evolutionService.sendText(instanceName, remoteJid,
            "Recebi a imagem mas o formato não é suportado. Pode mandar em JPEG ou PNG?"
          ).catch(() => {});
          return;
        }
        bufferItem = {
          type: "image",
          base64: media.base64,
          mimeType,
          caption: msg.imageMessage.caption || undefined,
        };
        console.log(`🖼️  Imagem recebida (${mimeType})${msg.imageMessage.caption ? ` — caption: "${msg.imageMessage.caption}"` : ""}`);
      } catch (err) {
        console.error("Erro ao baixar imagem:", err);
        await evolutionService.sendText(instanceName, remoteJid,
          "Recebi uma imagem mas não consegui processá-la. Pode descrever o que precisa?"
        ).catch(() => {});
        return;
      }
    } else if (msg?.documentMessage) {
      const mimeType: string = msg.documentMessage.mimetype || "";
      if (mimeType !== "application/pdf") {
        await evolutionService.sendText(instanceName, remoteJid,
          "Recebi o arquivo, mas só consigo processar documentos em PDF. Pode mandar em PDF?"
        ).catch(() => {});
        return;
      }
      try {
        console.log(`📄 [${instanceName}] ${contactPhone}: baixando PDF...`);
        const media = await evolutionService.getMediaBase64(instanceName, {
          key: messageData.key,
          message: msg,
        });
        bufferItem = {
          type: "document",
          base64: media.base64,
          mimeType: "application/pdf",
          filename: msg.documentMessage.fileName || "documento.pdf",
        };
        console.log(`📄 PDF recebido: ${msg.documentMessage.fileName || "documento.pdf"}`);
      } catch (err) {
        console.error("Erro ao baixar PDF:", err);
        await evolutionService.sendText(instanceName, remoteJid,
          "Recebi um documento mas não consegui processá-lo. Pode tentar enviar novamente?"
        ).catch(() => {});
        return;
      }
    } else if (msg?.audioMessage || msg?.pttMessage) {
      if (!process.env.GROQ_API_KEY) {
        await evolutionService.sendText(instanceName, remoteJid,
          "Por enquanto só consigo responder mensagens de texto."
        ).catch(() => {});
        return;
      }
      try {
        console.log(`🎤 [${instanceName}] ${contactPhone}: transcrevendo áudio...`);
        const media = await evolutionService.getMediaBase64(instanceName, {
          key: messageData.key,
          message: msg,
        });
        const text = await transcriptionService.transcribe(media.base64, media.mimetype || "audio/ogg");
        console.log(`🎤 Transcrição: "${text}"`);
        bufferItem = { type: "text", text };
      } catch (err) {
        console.error("Erro ao transcrever áudio:", err);
        await evolutionService.sendText(instanceName, remoteJid,
          "Não consegui entender o áudio. Pode digitar sua mensagem?"
        ).catch(() => {});
        return;
      }
    }

    if (!bufferItem) return;

    // ── Detectar pedido de atendente humano (sem buffer) ─────────────────
    const text = bufferItem.type === "text" ? bufferItem.text : (bufferItem.type === "image" ? (bufferItem.caption ?? "") : "");
    if (text && detectsHumanRequest(text)) {
      // Cancela qualquer buffer pendente para este usuário
      if (pendingTimers.has(`${instanceName}:${contactPhone}`)) {
        clearTimeout(pendingTimers.get(`${instanceName}:${contactPhone}`)!);
        pendingBuffers.delete(`${instanceName}:${contactPhone}`);
        pendingTimers.delete(`${instanceName}:${contactPhone}`);
      }

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { humanMode: true, humanModeActivatedAt: new Date() },
      });

      await evolutionService.sendText(instanceName, remoteJid,
        "Claro! Vou chamar um atendente para continuar o seu atendimento.\n\nEm breve alguém entrará em contato. Obrigada pela paciência!"
      ).catch(() => {});

      if (clinic.adminPhone) {
        await evolutionService.sendText(instanceName, `${clinic.adminPhone}@s.whatsapp.net`,
          `Solicitação de atendimento humano\n\nCliente: ${conversation.contactName || contactPhone}\nTelefone: ${contactPhone}\n\nResponda diretamente para ${contactPhone}\n\nPara reativar a IA, use o painel de admin.`
        ).catch(() => {});
      }

      console.log(`👤 [${instanceName}] ${contactPhone} solicitou atendente humano`);
      return;
    }

    // ── Buffer: acumula itens e reinicia o timer ─────────────────────────
    const key = `${instanceName}:${contactPhone}`;
    const existing = pendingBuffers.get(key);

    if (existing) {
      existing.items.push(bufferItem);
      if (pushName && !existing.contactName) existing.contactName = pushName;
    } else {
      pendingBuffers.set(key, {
        instanceName,
        remoteJid,
        contactPhone,
        contactName: conversation.contactName ?? pushName ?? null,
        clinic,
        conversationId: conversation.id,
        items: [bufferItem],
      });
    }

    // Reinicia o timer a cada nova mensagem
    if (pendingTimers.has(key)) clearTimeout(pendingTimers.get(key)!);
    const timer = setTimeout(() => flushBuffer(key), BUFFER_DELAY_MS);
    pendingTimers.set(key, timer);

  } catch (err: any) {
    console.error(`❌ Erro no webhook [${instanceName}]:`, err?.message ?? err);
  }
}
