import { Router } from "express";
import { z } from "zod";
import { prisma } from "../database/prisma";
import { documentService } from "../services/document.service";
import { uploadSingleFile } from "../middleware/upload.middleware";

const MAX_DOCS_PER_PRESET = 10;

const router = Router();

const presetSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  basePrompt: z.string().min(10),
  allowedTopics: z.array(z.string().min(1)).default([]),
  active: z.boolean().optional(),
});

const docSelect = {
  id: true, filename: true, mimeType: true, sizeBytes: true, charCount: true, createdAt: true,
} as const;

router.post("/", async (req, res) => {
  const parsed = presetSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  try {
    const preset = await prisma.preset.create({ data: parsed.data });
    res.status(201).json(preset);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/", async (_req, res) => {
  const presets = await prisma.preset.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clinics: true, documents: true } } },
  });
  res.json(presets);
});

router.get("/:id", async (req, res) => {
  const preset = await prisma.preset.findUnique({
    where: { id: req.params.id as string },
    include: {
      documents: { select: docSelect, orderBy: { createdAt: "desc" } },
      clinics: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!preset) { res.status(404).json({ error: "Preset não encontrado" }); return; }
  res.json(preset);
});

router.patch("/:id", async (req, res) => {
  const parsed = presetSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  try {
    const preset = await prisma.preset.update({ where: { id: req.params.id as string }, data: parsed.data });
    res.json(preset);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  const linked = await prisma.clinic.count({ where: { presetId: req.params.id } });
  if (linked > 0) {
    res.status(409).json({ error: `Este preset está vinculado a ${linked} clínica(s). Desvincule antes de excluir.` });
    return;
  }
  await prisma.preset.delete({ where: { id: req.params.id as string } });
  res.status(204).end();
});

router.post("/:id/documents", uploadSingleFile, async (req, res) => {
  try {
    const preset = await prisma.preset.findUnique({
      where: { id: req.params.id as string },
      include: { _count: { select: { documents: true } } },
    });
    if (!preset) { res.status(404).json({ error: "Preset não encontrado" }); return; }
    if (preset._count.documents >= MAX_DOCS_PER_PRESET) {
      res.status(400).json({ error: `Limite de ${MAX_DOCS_PER_PRESET} documentos por preset atingido.` });
      return;
    }
    const doc = await documentService.ingest(req.file!, {
      presetId: preset.id,
      uploadedBy: (req as any).auth?.userId,
    });
    res.status(201).json(doc);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/:id/documents/:docId", async (req, res) => {
  const { count } = await prisma.knowledgeDocument.deleteMany({
    where: { id: req.params.docId as string, presetId: req.params.id as string },
  });
  if (count === 0) { res.status(404).json({ error: "Documento não encontrado" }); return; }
  res.status(204).end();
});

export default router;
