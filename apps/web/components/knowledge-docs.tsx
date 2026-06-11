"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export interface KnowledgeDoc {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  charCount: number;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function KnowledgeDocs({
  docs,
  limit,
  onUpload,
  onDelete,
  hint,
}: {
  docs: KnowledgeDoc[];
  limit: number;
  onUpload: (file: File) => Promise<void>;
  onDelete: (doc: KnowledgeDoc) => Promise<void>;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      toast.success(`"${file.name}" adicionado à base de conhecimento`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(doc: KnowledgeDoc) {
    setDeletingId(doc.id);
    try {
      await onDelete(doc);
      toast.success("Documento removido");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(doc.sizeBytes)} · {doc.charCount.toLocaleString("pt-BR")} caracteres
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                aria-label={`Remover ${doc.filename}`}
                className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || docs.length >= limit}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {uploading ? "Enviando..." : "Anexar documento"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {docs.length}/{limit} · PDF, TXT ou Markdown (máx. 5MB)
        </span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
