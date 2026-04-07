"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import type { Client, ProgressNote, NoteStatus } from "@/lib/types/database";

const STATUS_ORDER: NoteStatus[] = ["draft", "reviewed", "finalized", "uploaded_to_iconnect"];
const STATUS_LABELS: Record<NoteStatus, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  finalized: "Finalized",
  uploaded_to_iconnect: "Uploaded to iConnect",
};

export function NoteViewClient({
  client,
  note: initialNote,
}: {
  client: Client;
  note: ProgressNote;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [editableText, setEditableText] = useState(note.final_text || note.generated_text || "");
  const [saving, setSaving] = useState(false);
  const isDraft = note.status === "draft";

  async function handleCopy() {
    await navigator.clipboard.writeText(editableText);
    toast.success("Copied to clipboard! Paste into iConnect.");
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
    toast.success("Note saved");
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this note? This will also unlink it from the calendar.")) return;
    const supabase = createClient();
    // Unlink from calendar
    await supabase
      .from("annual_calendar")
      .update({ required_contact_1_note_id: null, status: "pending" })
      .eq("required_contact_1_note_id", note.id);
    await supabase
      .from("annual_calendar")
      .update({ required_contact_2_note_id: null, status: "pending" })
      .eq("required_contact_2_note_id", note.id);
    // Unlink events
    await supabase
      .from("client_events")
      .update({ documented_in_note_id: null })
      .eq("documented_in_note_id", note.id);
    // Delete the note
    const { error } = await supabase.from("progress_notes").delete().eq("id", note.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Note deleted");
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
      await navigator.clipboard.writeText(editableText);
      toast.success("Finalized & copied to clipboard!");
    } else {
      toast.success(`Status changed to ${STATUS_LABELS[newStatus]}`);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {note.contact_type} Note: {client.first_name} {client.last_name}
          </h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={note.contact_type === "FF" ? "default" : note.contact_type === "ADM" ? "outline" : "secondary"}>
              {note.contact_type}
            </Badge>
            <Badge variant="outline">{note.note_category?.replace(/_/g, " ")}</Badge>
            <Badge variant="secondary" className="capitalize">{note.status.replace(/_/g, " ")}</Badge>
            <span className="text-sm text-muted-foreground">{formatDate(note.note_date)}</span>
          </div>
        </div>
        <Button variant="outline" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Note Text {isDraft ? "(editable)" : "(read-only — finalize to lock)"}</Label>
          <Textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            rows={20}
            className="font-mono text-sm"
            readOnly={!isDraft}
          />
        </div>

        {note.contact_with && (
          <Card>
            <CardContent className="py-3">
              <span className="text-sm text-muted-foreground">Contact with: </span>
              <span className="text-sm font-medium">{note.contact_with}</span>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {isDraft && (
            <>
              <Button onClick={handleSave} disabled={saving} variant="outline">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={() => handleStatusChange("finalized")}>
                <Copy className="h-4 w-4 mr-2" />
                Finalize & Copy
              </Button>
            </>
          )}
          {note.status === "finalized" && (
            <Button onClick={() => handleStatusChange("uploaded_to_iconnect")} variant="outline">
              <Check className="h-4 w-4 mr-2" />
              Mark as Uploaded to iConnect
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Note
          </Button>
        </div>
      </div>
    </div>
  );
}
