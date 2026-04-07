"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ProgressNote, NoteCategory, NoteStatus } from "@/lib/types/database";

const CATEGORY_LABELS: Partial<Record<NoteCategory, string>> = {
  monthly_tc: "Monthly TC",
  monthly_ff: "Monthly FF",
  quarterly_provider_review: "Quarterly Review",
  hurricane_season: "Hurricane Season",
  service_auth_new_fy: "SA Distribution",
  pre_sp_activities: "Pre-SP Activities",
  sp_meeting_ff: "SP Meeting FF",
  sp_delivery: "SP Delivery",
  provider_contact: "Provider Contact",
  adm_cp_adjustment: "CP Adjustment",
  adm_sa_distribution: "SA Distribution",
  cdc_related: "CDC",
  custom: "Custom",
};

const STATUS_VARIANT: Record<NoteStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  reviewed: "secondary",
  finalized: "default",
  uploaded_to_iconnect: "default",
};

export function NotesListClient({
  clientId,
  clientName,
  initialNotes,
}: {
  clientId: string;
  clientName: string;
  initialNotes: ProgressNote[];
}) {
  const [notes, setNotes] = useState(initialNotes);

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const supabase = createClient();
    // Unlink from calendar
    await supabase.from("annual_calendar").update({ required_contact_1_note_id: null, status: "pending" }).eq("required_contact_1_note_id", noteId);
    await supabase.from("annual_calendar").update({ required_contact_2_note_id: null, status: "pending" }).eq("required_contact_2_note_id", noteId);
    await supabase.from("client_events").update({ documented_in_note_id: null }).eq("documented_in_note_id", noteId);
    const { error } = await supabase.from("progress_notes").delete().eq("id", noteId);
    if (error) { toast.error(error.message); return; }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast.success("Note deleted");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notes: {clientName}</h1>
          <p className="text-muted-foreground">{notes.length} notes</p>
        </div>
        <Link href={`/clients/${clientId}/notes/new`} className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Generate Note
        </Link>
      </div>

      {notes.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell>
                    <Link
                      href={`/clients/${clientId}/notes/${note.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {formatDate(note.note_date)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={note.contact_type === "FF" ? "default" : note.contact_type === "ADM" ? "outline" : "secondary"}>
                      {note.contact_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {CATEGORY_LABELS[note.note_category as NoteCategory] ?? note.note_category}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[note.status as NoteStatus]} className="capitalize">
                      {note.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {(note.final_text || note.generated_text || "").slice(0, 80)}...
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(note.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          No notes yet for this client.
        </div>
      )}
    </div>
  );
}
