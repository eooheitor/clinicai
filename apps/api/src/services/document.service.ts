import { PDFParse } from "pdf-parse";
import { prisma } from "../database/prisma";

const MAX_STORED_CHARS = 50_000;

const TEXT_MIMES = ["text/plain", "text/markdown"];
const PDF_MIME = "application/pdf";

export const ACCEPTED_MIMES = [PDF_MIME, ...TEXT_MIMES];

export const documentService = {
  async extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    let text: string;

    if (mimeType === PDF_MIME) {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = result.text.replace(/^-- \d+ of \d+ --$/gm, "");
      } finally {
        await parser.destroy();
      }
    } else if (TEXT_MIMES.includes(mimeType) || /\.(txt|md)$/i.test(filename)) {
      text = buffer.toString("utf-8");
    } else {
      throw new Error(`Formato não suportado: ${mimeType}. Envie PDF, TXT ou Markdown.`);
    }

    const normalized = text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!normalized) {
      throw new Error(
        `Não foi possível extrair texto de "${filename}". Se for um PDF escaneado (imagem), envie uma versão com texto selecionável.`
      );
    }

    return normalized.length > MAX_STORED_CHARS
      ? `${normalized.slice(0, MAX_STORED_CHARS)}\n[conteúdo truncado]`
      : normalized;
  },

  async ingest(
    file: Express.Multer.File,
    target: { presetId?: string; clinicId?: string; uploadedBy?: string }
  ) {
    const filename = Buffer.from(file.originalname, "latin1").toString("utf-8");
    const content = await this.extractText(file.buffer, file.mimetype, filename);
    return prisma.knowledgeDocument.create({
      data: {
        filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        charCount: content.length,
        content,
        uploadedBy: target.uploadedBy,
        presetId: target.presetId,
        clinicId: target.clinicId,
      },
      select: { id: true, filename: true, mimeType: true, sizeBytes: true, charCount: true, createdAt: true },
    });
  },
};
