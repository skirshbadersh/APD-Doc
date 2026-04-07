"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { copyRichText } from "@/lib/rich-text";
import { RichNoteEditor } from "@/components/notes/rich-note-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import type { Client, ProgressNote, NoteStatus } from "@/lib/types/database";

const STATUS_KEY: Record<NoteStatus, string> = {
  draft: "status.draft",
  reviewed: "status.reviewed",
  finalized: "status.finalized",
  uploaded_to_iconnect: "status.uploadedToIconnect",
};

export function NoteViewClient({
  client,
  note: initialNote,
}: {
  client: Client;
  note: ProgressNote;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [note, setNote] = useState(initialNote);
  const [editableText, setEditableText] = useState(note.final_text || note.generated_text || "");
  const [saving, setSaving] = useState(false);
  const isDraft = note.status === "draft";

  async function handleCopy() {
    await copyRichText(editableText);
    toast.success(t("notes.copiedClipboard"));
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("progress_notes")
      .update({ final_text: editableText })
      .eq("id", note.id)
      .select()
      .single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    setNote(data);
    toast.success(t("notes.noteSaved"));
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(t("notes.deleteConfirm"))) return;
    const supabase = createClient();
    await supabase
      .from("annual_calendar")
      .update({ required_contact_1_note_id: null, status: "pending" })
      .eq("required_contact_1_note_id", note.id);
    await supabase
      .from("annual_calendar")
      .update({ required_contact_2_note_id: null, status: "pending" })
      .eq("required_contact_2_note_id", note.id);
    await supabase
      .from("client_events")
      .update({ documented_in_note_id: null })
      .eq("documented_in_note_id", note.id);
    const { error } = await supabase.from("progress_notes").delete().eq("id", note.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("notes.noteDeleted"));
    router.push(`/clients/${client.id}/notes`);
    router.refresh();
  }

  async function handleStatusChange(newStatus: NoteStatus) {
    const supabase = createClient();
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "finalized") {
      updates.final_text = editableText;
    }
    const { data, error } = await supabase
      .from("progress_notes")
      .update(updates)
      .eq("id", note.id)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setNote(data);
    if (newStatus === "finalized") {
      await copyRichText(editableText);
      toast.success(t("notes.finalizedCopiedSingle"));
    } else {
      toast.success(t("notes.statusChanged", { status: t(STATUS_KEY[newStatus]) }));
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {t("notes.noteView", { type: note.contact_type, name: `${client.first_name} ${client.last_name}` })}
          </h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={note.contact_type === "FF" ? "default" : note.contact_type === "ADM" ? "outline" : "secondary"}>
              {note.contact_type}
            </Badge>
            <Badge variant="outline">{note.note_category?.replace(/_/g, " ")}</Badge>
            <Badge variant="secondary" className="capitalize">{t(STATUS_KEY[note.status])}</Badge>
            <span className="text-sm text-muted-foreground">{formatDate(note.note_date)}</span>
          </div>
        </div>
        <Button variant="outline" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          {t("notes.copyToClipboard")}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{isDraft ? t("notes.editable") : t("notes.readOnly")}</Label>
          <RichNoteEditor
            value={editableText}
            onChange={setEditableText}
            readOnly={!isDraft}
            rows={20}
          />
        </div>

        {note.contact_with && (
          <Card>
            <CardContent className="py-3">
              <span className="text-sm text-muted-foreground">{t("notes.contactWith")} </span>
              <span className="text-sm font-medium">{note.contact_with}</span>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {isDraft && (
            <>
              <Button onClick={handleSave} disabled={saving} variant="outline">
                {saving ? t("notes.saving") : t("notes.saveChanges")}
              </Button>
              <Button onClick={() => handleStatusChange("finalized")}>
                <Copy className="h-4 w-4 mr-2" />
                {t("notes.finalizeAndCopy")}
              </Button>
            </>
          )}
          {note.status === "finalized" && (
            <Button onClick={() => handleStatusChange("uploaded_to_iconnect")} variant="outline">
              <Check className="h-4 w-4 mr-2" />
              {t("notes.markUploaded")}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            {t("notes.deleteNote")}
          </Button>
        </div>
      </div>
    </div>
  );
}
