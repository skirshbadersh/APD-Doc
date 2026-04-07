"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createClient as createClientRecord,
  updateClient,
  type ClientFormData,
  type ConsiderationEntry,
  type ExtractedSubData,
} from "@/lib/queries/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";
import type { Client, ClientSpecialConsideration, SpecialConsideration } from "@/lib/types/database";
import { ALL_CONSIDERATIONS, CONSIDERATION_LABELS } from "@/lib/constants";

// Select component using native <select> for reliability
function NativeSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function buildInitialFormData(client?: Client | null): ClientFormData {
  return {
    first_name: client?.first_name ?? "",
    last_name: client?.last_name ?? "",
    nickname: client?.nickname ?? "",
    dob: client?.dob ?? "",
    gender: client?.gender ?? "",
    medicaid_id: client?.medicaid_id ?? "",
    iconnect_id: client?.iconnect_id ?? "",
    address_street: client?.address_street ?? "",
    address_city: client?.address_city ?? "",
    address_state: client?.address_state ?? "FL",
    address_zip: client?.address_zip ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    region: client?.region ?? "",
    spoken_language: client?.spoken_language ?? "English",
    alternate_communication: client?.alternate_communication ?? "",
    living_setting: client?.living_setting ?? "family_home",
    coordination_type: client?.coordination_type ?? "full_home",
    sp_effective_date: client?.sp_effective_date ?? "",
    primary_diagnosis: client?.primary_diagnosis ?? "",
    secondary_diagnosis: client?.secondary_diagnosis ?? "",
    other_diagnoses: client?.other_diagnoses ?? "",
    legal_status: client?.legal_status ?? "",
    allergies: client?.allergies ?? "",
    weight: client?.weight ?? "",
    height: client?.height ?? "",
    iq: client?.iq?.toString() ?? "",
    has_safety_plan: client?.has_safety_plan ?? false,
    disaster_plan_date: client?.disaster_plan_date ?? "",
    is_cdc: client?.is_cdc ?? false,
    cdc_start_date: client?.cdc_start_date ?? "",
  };
}

function buildInitialConsiderations(
  existing?: ClientSpecialConsideration[] | null
): ConsiderationEntry[] {
  const map = new Map(existing?.map((c) => [c.consideration, c.details ?? ""]));
  return ALL_CONSIDERATIONS.map((key) => ({
    consideration: key,
    checked: map.has(key),
    details: map.get(key) ?? "",
  }));
}

export function ClientForm({
  mode,
  client,
  existingConsiderations,
  userId,
  initialFormData,
  initialConsiderationEntries,
  fromExtraction = false,
  extractedSubData,
}: {
  mode: "create" | "edit";
  client?: Client | null;
  existingConsiderations?: ClientSpecialConsideration[] | null;
  userId: string;
  initialFormData?: ClientFormData;
  initialConsiderationEntries?: ConsiderationEntry[];
  fromExtraction?: boolean;
  extractedSubData?: ExtractedSubData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ClientFormData>(
    () => initialFormData ?? buildInitialFormData(client)
  );
  const [considerations, setConsiderations] = useState<ConsiderationEntry[]>(
    () => initialConsiderationEntries ?? buildInitialConsiderations(existingConsiderations)
  );

  function updateField<K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleConsideration(idx: number) {
    setConsiderations((prev) =>
      prev.map((c, i) =>
        i === idx ? { ...c, checked: !c.checked, details: !c.checked ? c.details : "" } : c
      )
    );
  }

  function updateConsiderationDetails(idx: number, details: string) {
    setConsiderations((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, details } : c))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name) {
      toast.error("First name and last name are required");
      return;
    }
    setLoading(true);

    const supabase = createClient();

    if (mode === "create") {
      const { data, error } = await createClientRecord(supabase, userId, form, considerations, extractedSubData);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      // Auto-generate calendar if SP date is set
      if (form.sp_effective_date && data) {
        fetch("/api/calendar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: data.id }),
        }).catch(() => {}); // non-blocking
      }
      toast.success("Client created");
      router.push(`/clients/${data!.id}`);
    } else {
      const { error } = await updateClient(supabase, client!.id, form, considerations);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Client updated");
      router.push(`/clients/${client!.id}`);
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {fromExtraction && (
        <Alert className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          <AlertDescription>
            Data extracted from uploaded document. Please review before saving.
          </AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="basic">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="coordination">Coordination</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="considerations">Special Considerations</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        {/* ---- Section 1: Basic Info ---- */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input
                    id="nickname"
                    value={form.nickname}
                    onChange={(e) => updateField("nickname", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={form.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <NativeSelect
                    id="gender"
                    value={form.gender}
                    onChange={(v) => updateField("gender", v)}
                    options={[
                      { value: "", label: "Select..." },
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spoken_language">Spoken Language</Label>
                  <Input
                    id="spoken_language"
                    value={form.spoken_language}
                    onChange={(e) => updateField("spoken_language", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="medicaid_id">Medicaid ID</Label>
                  <Input
                    id="medicaid_id"
                    value={form.medicaid_id}
                    onChange={(e) => updateField("medicaid_id", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iconnect_id">iConnect ID</Label>
                  <Input
                    id="iconnect_id"
                    value={form.iconnect_id}
                    onChange={(e) => updateField("iconnect_id", e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="address_street">Street Address</Label>
                <Input
                  id="address_street"
                  value={form.address_street}
                  onChange={(e) => updateField("address_street", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="address_city">City</Label>
                  <Input
                    id="address_city"
                    value={form.address_city}
                    onChange={(e) => updateField("address_city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_state">State</Label>
                  <Input
                    id="address_state"
                    value={form.address_state}
                    onChange={(e) => updateField("address_state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_zip">ZIP</Label>
                  <Input
                    id="address_zip"
                    value={form.address_zip}
                    onChange={(e) => updateField("address_zip", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    placeholder="e.g. Southern"
                    value={form.region}
                    onChange={(e) => updateField("region", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternate_communication">Alternate Communication</Label>
                <Input
                  id="alternate_communication"
                  placeholder="e.g. Smart Phone, picture board"
                  value={form.alternate_communication}
                  onChange={(e) => updateField("alternate_communication", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Section 2: Coordination ---- */}
        <TabsContent value="coordination">
          <Card>
            <CardHeader>
              <CardTitle>Coordination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="living_setting">Living Setting</Label>
                  <NativeSelect
                    id="living_setting"
                    value={form.living_setting}
                    onChange={(v) => updateField("living_setting", v)}
                    options={[
                      { value: "family_home", label: "Family Home" },
                      { value: "group_home", label: "Group Home" },
                      { value: "supported_living", label: "Supported Living" },
                      { value: "independent_living", label: "Independent Living" },
                      { value: "facility", label: "Facility" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coordination_type">Coordination Type</Label>
                  <NativeSelect
                    id="coordination_type"
                    value={form.coordination_type}
                    onChange={(v) => updateField("coordination_type", v)}
                    options={[
                      { value: "full_home", label: "Full — Family Home" },
                      { value: "full_gh", label: "Full — Group Home" },
                      { value: "full_supported_living", label: "Full — Supported Living" },
                      { value: "limited", label: "Limited" },
                    ]}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp_effective_date">
                  SP Effective Date{" "}
                  <span className="text-destructive font-normal">(most important field — drives all scheduling)</span>
                </Label>
                <Input
                  id="sp_effective_date"
                  type="date"
                  value={form.sp_effective_date}
                  onChange={(e) => updateField("sp_effective_date", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Section 3: Diagnoses ---- */}
        <TabsContent value="diagnoses">
          <Card>
            <CardHeader>
              <CardTitle>Diagnoses &amp; Legal Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary_diagnosis">Primary Diagnosis</Label>
                <Input
                  id="primary_diagnosis"
                  placeholder="e.g. F79 - Intellectual Disabilities, Unspecified"
                  value={form.primary_diagnosis}
                  onChange={(e) => updateField("primary_diagnosis", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_diagnosis">Secondary Diagnosis</Label>
                <Input
                  id="secondary_diagnosis"
                  value={form.secondary_diagnosis}
                  onChange={(e) => updateField("secondary_diagnosis", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other_diagnoses">Other Diagnoses</Label>
                <Textarea
                  id="other_diagnoses"
                  placeholder="Full list of additional diagnoses"
                  value={form.other_diagnoses}
                  onChange={(e) => updateField("other_diagnoses", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_status">Legal Status</Label>
                <Input
                  id="legal_status"
                  placeholder="e.g. Has Been Adjudicated Incapacitated"
                  value={form.legal_status}
                  onChange={(e) => updateField("legal_status", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Section 4: Health ---- */}
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input
                  id="allergies"
                  placeholder="e.g. No known allergies"
                  value={form.allergies}
                  onChange={(e) => updateField("allergies", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    placeholder="e.g. 178"
                    value={form.weight}
                    onChange={(e) => updateField("weight", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    placeholder={`e.g. 4'9`}
                    value={form.height}
                    onChange={(e) => updateField("height", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iq">IQ (optional)</Label>
                  <Input
                    id="iq"
                    type="number"
                    value={form.iq}
                    onChange={(e) => updateField("iq", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Section 5: Special Considerations ---- */}
        <TabsContent value="considerations">
          <Card>
            <CardHeader>
              <CardTitle>Special Considerations</CardTitle>
              <p className="text-sm text-muted-foreground">
                These flags change the language used in progress note templates.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {considerations.map((entry, idx) => (
                  <div key={entry.consideration} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`cons-${entry.consideration}`}
                        checked={entry.checked}
                        onCheckedChange={() => toggleConsideration(idx)}
                      />
                      <Label
                        htmlFor={`cons-${entry.consideration}`}
                        className="font-normal cursor-pointer"
                      >
                        {CONSIDERATION_LABELS[entry.consideration]}
                      </Label>
                    </div>
                    {entry.checked && (
                      <div className="ml-7">
                        <Input
                          placeholder="Details (optional) — e.g. specifics from the SP"
                          value={entry.details}
                          onChange={(e) => updateConsiderationDetails(idx, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Section 6: Other ---- */}
        <TabsContent value="other">
          <Card>
            <CardHeader>
              <CardTitle>Other</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="has_safety_plan">Has Safety Plan</Label>
                <Switch
                  id="has_safety_plan"
                  checked={form.has_safety_plan}
                  onCheckedChange={(checked) => updateField("has_safety_plan", checked as boolean)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disaster_plan_date">Disaster Plan Date</Label>
                <Input
                  id="disaster_plan_date"
                  type="date"
                  value={form.disaster_plan_date}
                  onChange={(e) => updateField("disaster_plan_date", e.target.value)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="is_cdc">CDC+ Participant</Label>
                <Switch
                  id="is_cdc"
                  checked={form.is_cdc}
                  onCheckedChange={(checked) => updateField("is_cdc", checked as boolean)}
                />
              </div>
              {form.is_cdc && (
                <div className="space-y-2">
                  <Label htmlFor="cdc_start_date">CDC Start Date</Label>
                  <Input
                    id="cdc_start_date"
                    type="date"
                    value={form.cdc_start_date}
                    onChange={(e) => updateField("cdc_start_date", e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Client"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
