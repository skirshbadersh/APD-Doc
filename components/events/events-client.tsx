"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import type { ClientEvent, EventType } from "@/lib/types/database";

const EVENT_TYPES: EventType[] = [
  "address_change", "living_setting_change", "guardian_change",
  "provider_change", "service_change", "hospitalization",
  "health_change", "behavioral_incident", "goal_change",
  "family_change", "program_change", "compliance_event", "other",
];

type FormState = {
  event_date: string;
  event_type: EventType;
  description: string;
  requires_sp_update: boolean;
  requires_cp_amendment: boolean;
};

const EMPTY_FORM: FormState = {
  event_date: new Date().toISOString().split("T")[0],
  event_type: "other",
  description: "",
  requires_sp_update: false,
  requires_cp_amendment: false,
};

function toForm(e: ClientEvent): FormState {
  return {
    event_date: e.event_date,
    event_type: e.event_type,
    description: e.description,
    requires_sp_update: e.requires_sp_update,
    requires_cp_amendment: e.requires_cp_amendment,
  };
}

export function EventsClient({
  clientId,
  initial,
}: {
  clientId: string;
  initial: ClientEvent[];
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ClientEvent[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(e: ClientEvent) {
    setEditingId(e.id);
    setForm(toForm(e));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.description) { toast.error(t("events.descriptionRequired")); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      client_id: clientId,
      event_date: form.event_date,
      event_type: form.event_type,
      description: form.description,
      requires_sp_update: form.requires_sp_update,
      requires_cp_amendment: form.requires_cp_amendment,
    };

    if (editingId) {
      const { data, error } = await supabase.from("client_events").update(payload).eq("id", editingId).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => prev.map((e) => (e.id === editingId ? data : e)));
    } else {
      const { data, error } = await supabase.from("client_events").insert(payload).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => [data, ...prev]);
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems((p) => p.filter((e) => e.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("client_events").delete().eq("id", id);
    if (error) { toast.error(error.message); setItems(prev); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {t("events.logEvent")}
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("events.date")}</TableHead>
                <TableHead>{t("events.type")}</TableHead>
                <TableHead>{t("events.description")}</TableHead>
                <TableHead>{t("events.flags")}</TableHead>
                <TableHead>{t("events.documented")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(e.event_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t("eventType." + e.event_type)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    <p className="truncate">{e.description}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {e.requires_sp_update && <Badge variant="destructive" className="text-[10px]">{t("events.spUpdate")}</Badge>}
                      {e.requires_cp_amendment && <Badge variant="destructive" className="text-[10px]">{t("events.cpAmend")}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {e.documented_in_note_id ? (
                      <span className="text-green-600 text-sm">{t("events.yes")}</span>
                    ) : (
                      <span className="text-yellow-600 text-sm">{t("events.no")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          {t("events.noEvents")}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t("events.editEvent") : t("events.logEvent")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("events.eventDate")}</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("events.eventType")}</Label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {EVENT_TYPES.map((v) => (
                    <option key={v} value={v}>{t("eventType." + v)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("events.descriptionLabel")}</Label>
              <Textarea
                placeholder={t("events.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.requires_sp_update} onCheckedChange={(v) => setForm({ ...form, requires_sp_update: !!v })} />
                <Label className="font-normal">{t("events.requiresSPUpdate")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.requires_cp_amendment} onCheckedChange={(v) => setForm({ ...form, requires_cp_amendment: !!v })} />
                <Label className="font-normal">{t("events.requiresCPAmendment")}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : editingId ? t("events.saveChanges") : t("events.logEvent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
