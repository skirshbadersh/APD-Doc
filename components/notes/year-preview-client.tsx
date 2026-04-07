"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateNote } from "@/lib/templates";
import { snapToWeekday } from "@/lib/calendar/weekday-utils";
import { getMonthInSpYear } from "@/lib/templates/helpers";
import { copyRichText } from "@/lib/rich-text";
import { RichNoteEditor } from "@/components/notes/rich-note-editor";
import { linkNoteToCalendar } from "@/lib/queries/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copy, Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import type {
  Client, Contact, Service, Goal, Medication,
  ClientSpecialConsideration, Profile, AnnualCalendar,
  ContactType, NoteCategory,
} from "@/lib/types/database";
import type { TemplateContext } from "@/lib/templates/types";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CAT_LABELS: Partial<Record<NoteCategory, string>> = {
  monthly_tc: "Monthly TC", monthly_ff: "Monthly FF",
  quarterly_provider_review: "Quarterly Review", hurricane_season: "Hurricane Prep",
  service_auth_new_fy: "SA Distribution", pre_sp_activities: "Pre-SP Activities",
  sp_meeting_ff: "SP Meeting FF", sp_delivery: "SP Delivery",
};

interface YearNote {
  calendarId: string;
  month: number;
  year: number;
  slot: 1 | 2;
  contactType: ContactType;
  category: NoteCategory;
  date: string;
  text: string;
  isHomeVisit: boolean;
}

interface Props {
  client: Client;
  contacts: Contact[];
  services: Service[];
  goals: Goal[];
  medications: Medication[];
  considerations: ClientSpecialConsideration[];
  profile: Profile | null;
  calendar: AnnualCalendar[];
}

function weekdayInHalf(year: number, month: number, half: 1 | 2): string {
  const day = half === 1 ? 8 : 22;
  return snapToWeekday(new Date(year, month - 1, day)).toISOString().split("T")[0];
}

export function YearPreviewClient(props: Props) {
  const { client, contacts, services, goals, medications, considerations, profile, calendar } = props;
  const router = useRouter();

  const [notes, setNotes] = useState<YearNote[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);

  const lg = contacts.find((c) => c.is_legal_rep);
  const defaultContactWith = lg
    ? `${client.first_name} ${client.last_name} and ${lg.first_name} ${lg.last_name} (${client.first_name}'s ${lg.relationship || "Legal Representative"})`
    : `${client.first_name} ${client.last_name}`;
  const profileData = profile || { id: "", full_name: "WSC", qo_name: null, qo_phone: null, qo_email: null, created_at: "", updated_at: "" };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    const results: YearNote[] = [];

    // Generate all notes synchronously (templates are pure functions, no I/O)
    for (const cal of calendar) {
      const monthInSpYear = getMonthInSpYear(new Date(cal.year, cal.month - 1, 15), client.sp_effective_date);

      if (cal.required_contact_1_type && cal.required_contact_1_category) {
        const date = weekdayInHalf(cal.year, cal.month, 1);
        const ctx: TemplateContext = {
          client, contacts, services, goals, medications, considerations,
          events: [], profile: profileData,
          noteDate: new Date(date + "T12:00:00"),
          contactType: cal.required_contact_1_type as ContactType,
          noteCategory: cal.required_contact_1_category as NoteCategory,
          isHomeVisit: cal.is_home_visit_month && cal.required_contact_1_type === "FF",
          contactWith: defaultContactWith,
          spYear: cal.sp_year,
          monthInSpYear,
          contactSlot: 1,
        };
        const text = generateNote(cal.required_contact_1_category as NoteCategory, ctx)
          || `[${cal.required_contact_1_type} — ${cal.required_contact_1_category}]`;
        results.push({
          calendarId: cal.id, month: cal.month, year: cal.year, slot: 1,
          contactType: cal.required_contact_1_type as ContactType,
          category: cal.required_contact_1_category as NoteCategory,
          date, text,
          isHomeVisit: cal.is_home_visit_month && cal.required_contact_1_type === "FF",
        });
      }

      if (cal.required_contact_2_type && cal.required_contact_2_category) {
        const date = weekdayInHalf(cal.year, cal.month, 2);
        const ctx: TemplateContext = {
          client, contacts, services, goals, medications, considerations,
          events: [], profile: profileData,
          noteDate: new Date(date + "T12:00:00"),
          contactType: cal.required_contact_2_type as ContactType,
          noteCategory: cal.required_contact_2_category as NoteCategory,
          isHomeVisit: false,
          contactWith: defaultContactWith,
          spYear: cal.sp_year,
          monthInSpYear,
          contactSlot: 2,
        };
        const text = generateNote(cal.required_contact_2_category as NoteCategory, ctx)
          || `[${cal.required_contact_2_type} — ${cal.required_contact_2_category}]`;
        results.push({
          calendarId: cal.id, month: cal.month, year: cal.year, slot: 2,
          contactType: cal.required_contact_2_type as ContactType,
          category: cal.required_contact_2_category as NoteCategory,
          date, text, isHomeVisit: false,
        });
      }
    }

    // Small delay so the loading state is visible
    await new Promise((r) => setTimeout(r, 100));
    setNotes(results);
    setGenerated(true);
    setGenerating(false);
    toast.success(`Generated ${results.length} notes for the full year`);
  }, [calendar, client, contacts, services, goals, medications, considerations, profileData, defaultContactWith]);

  function updateNoteText(idx: number, text: string) {
    setNotes((prev) => prev.map((n, i) => i === idx ? { ...n, text } : n));
  }

  function updateNoteDate(idx: number, date: string) {
    setNotes((prev) => prev.map((n, i) => i === idx ? { ...n, date } : n));
  }

  async function handleCopySingle(idx: number) {
    await copyRichText(notes[idx].text);
    toast.success("Note copied to clipboard");
  }

  async function handleCopyAll() {
    const parts: string[] = [];
    let currentMonth = 0;
    let currentYear = 0;

    for (const note of notes) {
      if (note.month !== currentMonth || note.year !== currentYear) {
        parts.push(`${"=".repeat(60)}\n${MONTH_NAMES[note.month]} ${note.year}\n${"=".repeat(60)}`);
        currentMonth = note.month;
        currentYear = note.year;
      }
      parts.push(`--- Contact ${note.slot}: ${note.contactType} — ${CAT_LABELS[note.category] ?? note.category} (${note.date}) ---\n\n${note.text}`);
    }

    await copyRichText(parts.join("\n\n"));
    toast.success(`${notes.length} notes copied to clipboard`);
  }

  async function handleSaveAll(status: "draft" | "finalized") {
    setSaving(true);
    const supabase = createClient();
    let saved = 0;

    for (const note of notes) {
      const { data: savedNote, error } = await supabase
        .from("progress_notes")
        .insert({
          client_id: client.id,
          note_date: note.date,
          contact_type: note.contactType,
          contact_with: defaultContactWith,
          note_category: note.category,
          generated_text: note.text,
          final_text: note.text,
          is_home_visit: note.isHomeVisit,
          status,
          sp_year: calendar[0]?.sp_year ?? null,
        })
        .select()
        .single();

      if (error) {
        toast.error(`Error saving ${MONTH_NAMES[note.month]} Contact ${note.slot}: ${error.message}`);
        continue;
      }

      if (savedNote) {
        await linkNoteToCalendar(supabase, client.id, savedNote.id, note.month, note.year, note.slot);
        saved++;
      }
    }

    if (status === "finalized") {
      await handleCopyAll();
      toast.success(`${saved} notes finalized & copied`);
    } else {
      toast.success(`${saved} drafts saved`);
    }
    setSaving(false);
  }

  // Group notes by month for display
  const notesByMonth = new Map<string, YearNote[]>();
  for (const note of notes) {
    const key = `${note.year}-${note.month}`;
    if (!notesByMonth.has(key)) notesByMonth.set(key, []);
    notesByMonth.get(key)!.push(note);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/clients/${client.id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Full Year Preview: {client.first_name} {client.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {calendar[0]?.sp_year ? `SP Year ${calendar[0].sp_year}` : ""} — {calendar.length} months, {notes.length || "~" + calendar.length * 2} notes
            </p>
          </div>
        </div>
      </div>

      {!generated ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              This will generate all {calendar.length * 2} notes for {client.first_name}'s full SP year using the template system.
            </p>
            <Button onClick={handleGenerate} disabled={generating} size="lg">
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating {calendar.length * 2} notes...</>
              ) : (
                "Generate Full Year"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Month sections */}
          {Array.from(notesByMonth.entries()).map(([key, monthNotes]) => {
            const m = monthNotes[0].month;
            const y = monthNotes[0].year;
            const globalStartIdx = notes.indexOf(monthNotes[0]);

            return (
              <div key={key}>
                <h2 className="text-lg font-bold mb-3 sticky top-0 bg-background py-2 z-10 border-b">
                  {MONTH_NAMES[m]} {y}
                </h2>
                <div className="space-y-4">
                  {monthNotes.map((note) => {
                    const idx = notes.indexOf(note);
                    return (
                      <Card key={`${note.calendarId}-${note.slot}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Badge variant={note.contactType === "FF" ? "default" : note.contactType === "ADM" ? "outline" : "secondary"}>
                                {note.contactType}
                              </Badge>
                              Contact {note.slot} — {CAT_LABELS[note.category] ?? note.category}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={note.date}
                                onChange={(e) => updateNoteDate(idx, e.target.value)}
                                className="w-40 h-8 text-sm"
                              />
                              <Button variant="ghost" size="sm" onClick={() => handleCopySingle(idx)}>
                                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <RichNoteEditor
                            value={note.text}
                            onChange={(md) => updateNoteText(idx, md)}
                            rows={12}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Bottom actions */}
          <Separator />
          <div className="flex gap-3 sticky bottom-0 bg-background py-4 border-t">
            <Button onClick={() => handleSaveAll("finalized")} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
              {saving ? "Saving..." : `Finalize & Copy All Year (${notes.length})`}
            </Button>
            <Button variant="outline" onClick={() => handleSaveAll("draft")} disabled={saving}>
              Save All as Drafts
            </Button>
            <Button variant="outline" onClick={handleCopyAll}>
              <Copy className="h-4 w-4 mr-2" /> Copy All (no save)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
