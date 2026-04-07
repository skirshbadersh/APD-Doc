"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateNote } from "@/lib/templates";
import { snapToWeekday } from "@/lib/calendar/weekday-utils";
import { getMonthInSpYear } from "@/lib/templates/helpers";
import { linkNoteToCalendar } from "@/lib/queries/notes";
import { copyRichText } from "@/lib/rich-text";
import { RichNoteEditor } from "@/components/notes/rich-note-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Copy, ArrowRight, Loader2, Check, Plus, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import type {
  Client, Contact, Service, Goal, Medication,
  ClientSpecialConsideration, ClientEvent, Profile,
  ContactType, NoteCategory, AnnualCalendar,
} from "@/lib/types/database";
import type { TemplateContext } from "@/lib/templates/types";
import { CONSIDERATION_LABELS } from "@/lib/constants";

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

interface NoteSlot {
  slot: 1 | 2;
  contactType: ContactType;
  category: NoteCategory;
  date: string; // YYYY-MM-DD
  text: string;
  previousText: string | null; // for AI undo
  noteId: string | null; // after save
}

interface Props {
  client: Client;
  contacts: Contact[];
  services: Service[];
  goals: Goal[];
  medications: Medication[];
  considerations: ClientSpecialConsideration[];
  events: ClientEvent[];
  profile: Profile | null;
  calendarEntry: AnnualCalendar | null;
  month: number;
  year: number;
}

function weekdayInHalf(year: number, month: number, half: 1 | 2): string {
  const day = half === 1 ? 8 : 22;
  const d = snapToWeekday(new Date(year, month - 1, day));
  return d.toISOString().split("T")[0];
}

export function NoteGeneratorClient(props: Props) {
  const { client, contacts, services, goals, medications, considerations, events, profile, calendarEntry, month, year } = props;
  const router = useRouter();

  const lg = contacts.find((c) => c.is_legal_rep);
  const defaultContactWith = lg
    ? `${client.first_name} ${client.last_name} and ${lg.first_name} ${lg.last_name} (${client.first_name}'s ${lg.relationship || "Legal Representative"})`
    : `${client.first_name} ${client.last_name}`;

  const monthInSpYear = getMonthInSpYear(new Date(year, month - 1, 15), client.sp_effective_date);

  // Build note slots from calendar entry
  const [slots, setSlots] = useState<NoteSlot[]>([]);
  const [step, setStep] = useState<"editor" | "saved">("editor");
  const [saving, setSaving] = useState(false);
  const [nextClientHref, setNextClientHref] = useState<string | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  // Event insertion state
  const [eventText, setEventText] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventTarget, setEventTarget] = useState<1 | 2>(1);
  const [insertingAI, setInsertingAI] = useState(false);

  // Generate notes on mount
  useEffect(() => {
    if (slots.length > 0 || !calendarEntry) return;

    const newSlots: NoteSlot[] = [];
    const profileData = profile || { id: "", full_name: "WSC", qo_name: null, qo_phone: null, qo_email: null, created_at: "", updated_at: "" };

    if (calendarEntry.required_contact_1_type && calendarEntry.required_contact_1_category && !calendarEntry.required_contact_1_note_id) {
      const date = weekdayInHalf(year, month, 1);
      const ctx: TemplateContext = {
        client, contacts, services, goals, medications, considerations, events,
        profile: profileData,
        noteDate: new Date(date + "T12:00:00"),
        contactType: calendarEntry.required_contact_1_type as ContactType,
        noteCategory: calendarEntry.required_contact_1_category as NoteCategory,
        isHomeVisit: calendarEntry.is_home_visit_month && calendarEntry.required_contact_1_type === "FF",
        contactWith: defaultContactWith,
        spYear: calendarEntry.sp_year,
        monthInSpYear,
        contactSlot: 1,
      };
      const text = generateNote(calendarEntry.required_contact_1_category as NoteCategory, ctx) || `[${calendarEntry.required_contact_1_type} note — enter text]`;
      newSlots.push({
        slot: 1,
        contactType: calendarEntry.required_contact_1_type as ContactType,
        category: calendarEntry.required_contact_1_category as NoteCategory,
        date,
        text,
        previousText: null,
        noteId: null,
      });
    }

    if (calendarEntry.required_contact_2_type && calendarEntry.required_contact_2_category && !calendarEntry.required_contact_2_note_id) {
      const date = weekdayInHalf(year, month, 2);
      const ctx: TemplateContext = {
        client, contacts, services, goals, medications, considerations, events,
        profile: profileData,
        noteDate: new Date(date + "T12:00:00"),
        contactType: calendarEntry.required_contact_2_type as ContactType,
        noteCategory: calendarEntry.required_contact_2_category as NoteCategory,
        isHomeVisit: false,
        contactWith: defaultContactWith,
        spYear: calendarEntry.sp_year,
        monthInSpYear,
        contactSlot: 2,
      };
      const text = generateNote(calendarEntry.required_contact_2_category as NoteCategory, ctx) || `[${calendarEntry.required_contact_2_type} note — enter text]`;
      newSlots.push({
        slot: 2,
        contactType: calendarEntry.required_contact_2_type as ContactType,
        category: calendarEntry.required_contact_2_category as NoteCategory,
        date,
        text,
        previousText: null,
        noteId: null,
      });
    }

    if (newSlots.length > 0) setSlots(newSlots);
  }, [calendarEntry, client, contacts, services, goals, medications, considerations, events, profile, month, year, monthInSpYear, defaultContactWith, slots.length]);

  function updateSlotText(slot: 1 | 2, text: string) {
    setSlots((prev) => prev.map((s) => s.slot === slot ? { ...s, text } : s));
  }

  function updateSlotDate(slot: 1 | 2, date: string) {
    setSlots((prev) => prev.map((s) => s.slot === slot ? { ...s, date } : s));
  }

  // Auto-select event target based on date half
  useEffect(() => {
    const d = new Date(eventDate);
    setEventTarget(d.getDate() <= 15 ? 1 : 2);
  }, [eventDate]);

  // Manual event insert — places text before the closing line
  function handleInsertManual() {
    if (!eventText.trim()) { toast.error("Enter event description"); return; }
    const target = slots.find((s) => s.slot === eventTarget);
    if (!target) { toast.error("No matching note to insert into"); return; }

    const insertion = `During this month, ${eventText.trim()}`;
    const text = target.text;

    // Find the last paragraph (the closer) and insert before it
    const lastBreak = text.lastIndexOf("\n\n");
    if (lastBreak > 0) {
      const before = text.slice(0, lastBreak);
      const closer = text.slice(lastBreak);
      updateSlotText(eventTarget, `${before}\n\n${insertion}${closer}`);
    } else {
      updateSlotText(eventTarget, `${text}\n\n${insertion}`);
    }

    saveEvent();
    setEventText("");
    toast.success("Event inserted into note");
  }

  // AI-assisted event insert
  async function handleInsertAI() {
    if (!eventText.trim()) { toast.error("Enter event description"); return; }
    const target = slots.find((s) => s.slot === eventTarget);
    if (!target) { toast.error("No matching note to insert into"); return; }

    setInsertingAI(true);
    try {
      const res = await fetch("/api/notes/insert-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteText: target.text,
          eventDescription: eventText.trim(),
          eventDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI insertion failed");
      }
      const { updatedText } = await res.json();

      // Store previous text for undo
      setSlots((prev) => prev.map((s) =>
        s.slot === eventTarget ? { ...s, previousText: s.text, text: updatedText } : s
      ));
      saveEvent();
      setEventText("");
      toast.success("AI updated the note — review the changes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI insertion failed");
    } finally {
      setInsertingAI(false);
    }
  }

  function handleUndo(slot: 1 | 2) {
    setSlots((prev) => prev.map((s) =>
      s.slot === slot && s.previousText ? { ...s, text: s.previousText, previousText: null } : s
    ));
    toast.success("Reverted to previous version");
  }

  async function saveEvent() {
    const supabase = createClient();
    await supabase.from("client_events").insert({
      client_id: client.id,
      event_date: eventDate,
      event_type: "other",
      description: eventText.trim(),
    });
  }

  async function handleSaveAll(status: "draft" | "finalized") {
    setSaving(true);
    const supabase = createClient();
    const allTexts: string[] = [];

    for (const slot of slots) {
      const { data: note, error } = await supabase
        .from("progress_notes")
        .insert({
          client_id: client.id,
          note_date: slot.date,
          contact_type: slot.contactType,
          contact_with: defaultContactWith,
          note_category: slot.category,
          generated_text: slot.text,
          final_text: slot.text,
          is_home_visit: calendarEntry?.is_home_visit_month && slot.contactType === "FF",
          status,
          sp_year: calendarEntry?.sp_year ?? null,
        })
        .select()
        .single();

      if (error) {
        toast.error(`Error saving contact ${slot.slot}: ${error.message}`);
        setSaving(false);
        return;
      }

      // Link to calendar
      if (note && calendarEntry) {
        await linkNoteToCalendar(supabase, client.id, note.id, month, year, slot.slot);
      }

      setSlots((prev) => prev.map((s) => s.slot === slot.slot ? { ...s, noteId: note?.id ?? null } : s));
      allTexts.push(slot.text);
    }

    if (status === "finalized") {
      await copyRichText(allTexts.join("\n\n" + "=".repeat(60) + "\n\n"));
      toast.success(`${slots.length} note${slots.length > 1 ? "s" : ""} finalized & copied to clipboard!`);
    } else {
      toast.success(`${slots.length} draft${slots.length > 1 ? "s" : ""} saved`);
    }

    setSaving(false);
    setStep("saved");
    findNextClient();
  }

  async function handleCopySingle(slot: 1 | 2) {
    const s = slots.find((s) => s.slot === slot);
    if (!s) return;
    await copyRichText(s.text);
    toast.success(`Contact ${slot} copied to clipboard`);
  }

  async function findNextClient() {
    setLoadingNext(true);
    const supabase = createClient();

    const { data: pending } = await supabase
      .from("annual_calendar")
      .select("client_id, required_contact_1_type, required_contact_1_note_id")
      .eq("month", month)
      .eq("year", year)
      .in("status", ["pending", "in_progress"])
      .neq("client_id", client.id)
      .limit(1);

    if (pending && pending.length > 0) {
      setNextClientHref(`/clients/${pending[0].client_id}/notes/new?month=${month}&year=${year}`);
    } else {
      setNextClientHref(null);
    }
    setLoadingNext(false);
  }

  // ---- NO CALENDAR ENTRY ----
  if (!calendarEntry) {
    return (
      <div className="max-w-2xl text-center py-12">
        <p className="text-muted-foreground">No calendar entry found for {MONTH_NAMES[month]} {year}.</p>
        <p className="text-sm text-muted-foreground mt-2">Generate a calendar from the client's Calendar page first.</p>
      </div>
    );
  }

  // ---- ALL CONTACTS ALREADY DONE ----
  if (slots.length === 0 && step === "editor") {
    return (
      <div className="max-w-2xl text-center py-12 space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mx-auto">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">All done for {MONTH_NAMES[month]} {year}</h2>
        <p className="text-muted-foreground">All contacts for {client.first_name} are complete this month.</p>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  // ---- SAVED ----
  if (step === "saved") {
    return (
      <div className="max-w-2xl text-center py-12 space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mx-auto">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold">Notes Saved</h2>
        <p className="text-muted-foreground">
          {client.first_name} {client.last_name} — {MONTH_NAMES[month]} {year} — {slots.length} note{slots.length > 1 ? "s" : ""} finalized
        </p>
        <div className="flex flex-col items-center gap-3">
          {loadingNext ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : nextClientHref ? (
            <Button size="lg" onClick={() => router.push(nextClientHref!)}>
              Next Client <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <p className="text-lg font-medium text-green-600">All clients done for {MONTH_NAMES[month]}!</p>
          )}
          <Link href="/" className="text-sm text-muted-foreground hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // ---- EDITOR (MONTH VIEW) ----
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {client.first_name} {client.last_name} — {MONTH_NAMES[month]} {year}
          </h1>
          <p className="text-sm text-muted-foreground">
            {slots.length} contact{slots.length > 1 ? "s" : ""} to generate
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {considerations.map((c) => (
            <Badge key={c.id} variant="outline" className="text-[10px]">
              {CONSIDERATION_LABELS[c.consideration as keyof typeof CONSIDERATION_LABELS] ?? c.consideration}
            </Badge>
          ))}
        </div>
      </div>

      {/* NOTE SLOTS */}
      {slots.map((slot) => (
        <Card key={slot.slot}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant={slot.contactType === "FF" ? "default" : slot.contactType === "ADM" ? "outline" : "secondary"}>
                  {slot.contactType}
                </Badge>
                Contact {slot.slot} — {CAT_LABELS[slot.category] ?? slot.category}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateSlotDate(slot.slot, e.target.value)}
                  className="w-40 h-8 text-sm"
                />
                <Button variant="ghost" size="sm" onClick={() => handleCopySingle(slot.slot)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <RichNoteEditor
              value={slot.text}
              onChange={(md) => updateSlotText(slot.slot, md)}
              rows={16}
            />
            {slot.previousText && (
              <Button variant="outline" size="sm" onClick={() => handleUndo(slot.slot)}>
                Undo AI edit
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {/* EVENT INSERTION PANEL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Something happened this month?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>What happened?</Label>
              <Textarea
                placeholder="e.g., Client moved to a new address at 123 Main St, Miami FL 33101"
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>When?</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Insert into</Label>
                <select
                  value={eventTarget}
                  onChange={(e) => setEventTarget(parseInt(e.target.value) as 1 | 2)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {slots.map((s) => (
                    <option key={s.slot} value={s.slot}>
                      Contact {s.slot} ({s.contactType})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleInsertManual} disabled={!eventText.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Insert Manually
            </Button>
            <Button onClick={handleInsertAI} disabled={!eventText.trim() || insertingAI}>
              {insertingAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {insertingAI ? "AI is editing..." : "Add with AI"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <Separator />
      <div className="flex gap-3">
        <Button onClick={() => handleSaveAll("finalized")} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
          {saving ? "Saving..." : `Finalize & Copy All (${slots.length})`}
        </Button>
        <Button variant="outline" onClick={() => handleSaveAll("draft")} disabled={saving}>
          Save All as Drafts
        </Button>
      </div>
    </div>
  );
}
