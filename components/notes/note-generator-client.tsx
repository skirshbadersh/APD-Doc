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
import { useTranslation } from "@/lib/i18n/context";
import { getMonthNames1 } from "@/lib/i18n/format";

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
  const { t, locale } = useTranslation();
  const MONTH_NAMES = getMonthNames1(locale);

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
    if (!eventText.trim()) { toast.error(t("notes.enterEventDescription")); return; }
    const target = slots.find((s) => s.slot === eventTarget);
    if (!target) { toast.error(t("notes.noMatchingNote")); return; }

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
    toast.success(t("notes.eventInserted"));
  }

  // AI-assisted event insert
  async function handleInsertAI() {
    if (!eventText.trim()) { toast.error(t("notes.enterEventDescription")); return; }
    const target = slots.find((s) => s.slot === eventTarget);
    if (!target) { toast.error(t("notes.noMatchingNote")); return; }

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
      toast.success(t("notes.aiUpdated"));
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
    toast.success(t("notes.reverted"));
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
        toast.error(t("notes.errorSavingContact", { slot: String(slot.slot), message: error.message }));
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
      toast.success(t(slots.length > 1 ? "notes.finalizedCopied" : "notes.finalizedCopiedOne", { count: slots.length }));
    } else {
      toast.success(t(slots.length > 1 ? "notes.draftsSaved" : "notes.draftsSavedOne", { count: slots.length }));
    }

    setSaving(false);
    setStep("saved");
    findNextClient();
  }

  async function handleCopySingle(slot: 1 | 2) {
    const s = slots.find((s) => s.slot === slot);
    if (!s) return;
    await copyRichText(s.text);
    toast.success(t("notes.contactCopied", { slot: String(slot) }));
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
        <p className="text-muted-foreground">{t("notes.noCalendarEntry", { month: MONTH_NAMES[month], year })}</p>
        <p className="text-sm text-muted-foreground mt-2">{t("notes.generateCalendarFirst")}</p>
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
        <h2 className="text-2xl font-bold">{t("notes.allDoneMonth", { month: MONTH_NAMES[month], year })}</h2>
        <p className="text-muted-foreground">{t("notes.allContactsComplete", { name: client.first_name })}</p>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">{t("notes.backToDashboard")}</Link>
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
        <h2 className="text-2xl font-bold">{t("notes.notesSaved")}</h2>
        <p className="text-muted-foreground">
          {t(slots.length > 1 ? "notes.noteFinalized" : "notes.notesFinalizedOne", { name: `${client.first_name} ${client.last_name}`, month: MONTH_NAMES[month], year, count: slots.length })}
        </p>
        <div className="flex flex-col items-center gap-3">
          {loadingNext ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : nextClientHref ? (
            <Button size="lg" onClick={() => router.push(nextClientHref!)}>
              Next Client <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <p className="text-lg font-medium text-green-600">{t("notes.allClientsDone", { month: MONTH_NAMES[month] })}</p>
          )}
          <Link href="/" className="text-sm text-muted-foreground hover:underline">{t("notes.backToDashboard")}</Link>
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
            {t("notes.contactsToGenerate", { count: slots.length })}
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
                {t("notes.contactSlot", { slot: slot.slot })} — {t("noteCategory." + slot.category)}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateSlotDate(slot.slot, e.target.value)}
                  className="w-40 h-8 text-sm"
                />
                <Button variant="ghost" size="sm" onClick={() => handleCopySingle(slot.slot)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> {t("notes.copy")}
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
                {t("notes.undoAI")}
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
            {t("notes.somethingHappened")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label>{t("notes.whatHappened")}</Label>
              <Textarea
                placeholder={t("notes.whatHappenedPlaceholder")}
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("notes.when")}</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("notes.insertInto")}</Label>
                <select
                  value={eventTarget}
                  onChange={(e) => setEventTarget(parseInt(e.target.value) as 1 | 2)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {slots.map((s) => (
                    <option key={s.slot} value={s.slot}>
                      {t("notes.contactSlotType", { slot: s.slot, type: s.contactType })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleInsertManual} disabled={!eventText.trim()}>
              <Plus className="h-4 w-4 mr-1" /> {t("notes.insertManually")}
            </Button>
            <Button onClick={handleInsertAI} disabled={!eventText.trim() || insertingAI}>
              {insertingAI ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {insertingAI ? t("notes.aiEditing") : t("notes.addWithAI")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <Separator />
      <div className="flex gap-3">
        <Button onClick={() => handleSaveAll("finalized")} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
          {saving ? t("notes.saving") : t("notes.finalizeAndCopyAll", { count: slots.length })}
        </Button>
        <Button variant="outline" onClick={() => handleSaveAll("draft")} disabled={saving}>
          {t("notes.saveAllDrafts")}
        </Button>
      </div>
    </div>
  );
}
