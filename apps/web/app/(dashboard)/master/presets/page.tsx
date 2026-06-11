"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/skeletons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/field";
import { Stagger, StaggerItem } from "@/components/motion";
import { KnowledgeDocs, type KnowledgeDoc } from "@/components/knowledge-docs";
import { Sparkles, Plus, X, Building2, FileText, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface PresetSummary {
  id: string;
  name: string;
  description: string | null;
  basePrompt: string;
  allowedTopics: string[];
  active: boolean;
  _count: { clinics: number; documents: number };
}

interface PresetDetail extends Omit<PresetSummary, "_count"> {
  documents: KnowledgeDoc[];
  clinics: { id: string; name: string; slug: string }[];
}

interface PresetForm {
  name: string;
  description: string;
  basePrompt: string;
  allowedTopics: string[];
}

const EMPTY_FORM: PresetForm = { name: "", description: "", basePrompt: "", allowedTopics: [] };
const wrap = "px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

export default function PresetsPage() {
  const router = useRouter();
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PresetDetail | null>(null);
  const [form, setForm] = useState<PresetForm>(EMPTY_FORM);
  const [newTopic, setNewTopic] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PresetSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u?.role !== "MASTER") {
      router.replace("/dashboard");
      return;
    }
    load();
  }, []);

  async function load() {
    const data = await api.get<PresetSummary[]>("/panel/master/presets");
    setPresets(data);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNewTopic("");
    setShowForm(true);
  }

  async function openEdit(id: string) {
    try {
      const detail = await api.get<PresetDetail>(`/panel/master/presets/${id}`);
      setEditing(detail);
      setForm({
        name: detail.name,
        description: detail.description ?? "",
        basePrompt: detail.basePrompt,
        allowedTopics: Array.isArray(detail.allowedTopics) ? detail.allowedTopics : [],
      });
      setNewTopic("");
      setShowForm(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function addTopic() {
    const topic = newTopic.trim();
    if (!topic) return;
    setForm((f) => ({ ...f, allowedTopics: [...f.allowedTopics, topic] }));
    setNewTopic("");
  }

  function removeTopic(i: number) {
    setForm((f) => ({ ...f, allowedTopics: f.allowedTopics.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    if (!form.name.trim() || form.basePrompt.trim().length < 10) {
      toast.error("Preencha o nome e um prompt com pelo menos 10 caracteres");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        basePrompt: form.basePrompt,
        allowedTopics: form.allowedTopics,
      };
      if (editing) {
        await api.patch(`/panel/master/presets/${editing.id}`, body);
        toast.success("Preset atualizado");
      } else {
        await api.post("/panel/master/presets", body);
        toast.success("Preset criado — edite-o para anexar documentos");
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/panel/master/presets/${deleteTarget.id}`);
      toast.success("Preset excluído");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function uploadDoc(file: File) {
    if (!editing) return;
    const fd = new FormData();
    fd.append("file", file);
    const doc = await api.upload<KnowledgeDoc>(`/panel/master/presets/${editing.id}/documents`, fd);
    setEditing((p) => (p ? { ...p, documents: [doc, ...p.documents] } : p));
    load();
  }

  async function deleteDoc(doc: KnowledgeDoc) {
    if (!editing) return;
    await api.delete(`/panel/master/presets/${editing.id}/documents/${doc.id}`);
    setEditing((p) => (p ? { ...p, documents: p.documents.filter((d) => d.id !== doc.id) } : p));
    load();
  }

  return (
    <div className={`${wrap} space-y-6`}>
      <PageHeader
        title="Presets de IA"
        subtitle="Prompts principais, escopo de assuntos e base de conhecimento reutilizáveis entre clientes"
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Novo preset
        </Button>
      </PageHeader>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : presets.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nenhum preset criado"
          description="Crie um preset com o prompt principal e os assuntos permitidos, depois vincule clientes a ele na tela de Clientes."
          action={<Button onClick={openCreate}><Plus className="size-4" /> Novo preset</Button>}
        />
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {presets.map((p) => (
            <StaggerItem key={p.id}>
              <div className="surface hover-lift overflow-hidden rounded-2xl">
                <div className="bg-brand h-1.5 w-full" />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      <Sparkles className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-base font-semibold text-foreground">{p.name}</p>
                        {!p.active && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                      )}
                    </div>
                  </div>

                  {Array.isArray(p.allowedTopics) && p.allowedTopics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.allowedTopics.slice(0, 6).map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                      {p.allowedTopics.length > 6 && (
                        <Badge variant="secondary" className="text-xs">+{p.allowedTopics.length - 6}</Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="font-display text-xl font-semibold leading-none text-foreground">{p._count.clinics}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3" /> clientes</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="font-display text-xl font-semibold leading-none text-foreground">{p._count.documents}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><FileText className="size-3" /> documentos</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p.id)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.name}` : "Novo preset"}</DialogTitle>
            <DialogDescription>
              O prompt principal e os documentos do preset valem para todos os clientes vinculados a ele.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="preset-name">
                <Input id="preset-name" placeholder="Ex: Clínica Odontológica" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Descrição" htmlFor="preset-desc">
                <Input id="preset-desc" placeholder="Uso interno, opcional" value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </Field>
            </div>

            <Field
              label="Prompt principal"
              htmlFor="preset-prompt"
              hint="Use {{aiName}} e {{clinicName}} para interpolar o nome da atendente e da clínica de cada cliente."
            >
              <Textarea
                id="preset-prompt"
                rows={10}
                value={form.basePrompt}
                onChange={(e) => setForm((f) => ({ ...f, basePrompt: e.target.value }))}
                placeholder={"Você é {{aiName}}, atendente virtual da {{clinicName}}.\nDescreva comportamento, tom de voz, limites..."}
                className="resize-none font-mono text-xs leading-relaxed"
              />
            </Field>

            <Field
              label="Assuntos permitidos"
              htmlFor="preset-topic"
              hint="Se preencher, a IA recusa educadamente qualquer assunto fora desta lista. Deixe vazio para não restringir."
            >
              <div className="flex min-h-9 flex-wrap gap-2">
                {form.allowedTopics.map((t, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 pr-1.5 text-sm">
                    {t}
                    <button type="button" onClick={() => removeTopic(i)} className="transition-colors hover:text-destructive" aria-label={`Remover ${t}`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  id="preset-topic"
                  placeholder="Ex: agendamento de consultas, dúvidas sobre tratamentos..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTopic())}
                />
                <Button type="button" variant="outline" onClick={addTopic} className="shrink-0">
                  <Plus className="size-4" /> Adicionar
                </Button>
              </div>
            </Field>

            {editing && (
              <Field label="Base de conhecimento" htmlFor="preset-docs">
                <KnowledgeDocs
                  docs={editing.documents}
                  limit={10}
                  onUpload={uploadDoc}
                  onDelete={deleteDoc}
                  hint="O texto dos documentos é extraído e usado pela IA para responder aos clientes."
                />
              </Field>
            )}

            {editing && editing.clinics.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Vinculado a: {editing.clinics.map((c) => c.name).join(", ")}
              </p>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir ${deleteTarget?.name ?? "preset"}?`}
        description="Os documentos anexados ao preset também serão removidos. Clientes vinculados impedem a exclusão."
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
