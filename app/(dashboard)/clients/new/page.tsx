"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClientForm } from "@/components/clients/client-form";
import { SpUpload } from "@/components/clients/sp-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenLine, Upload, ArrowLeft } from "lucide-react";
import type { ClientFormData, ConsiderationEntry, ExtractedSubData } from "@/lib/queries/clients";
import type { SpExtractionResult } from "@/lib/claude/extract-sp";
import type { CpExtractionResult } from "@/lib/claude/extract-cp";
import { extractedToFormData, extractedToConsiderations } from "@/lib/claude/extract-sp";

type Mode = "choose" | "manual" | "upload" | "review";

export default function NewClientPage() {
  const [mode, setMode] = useState<Mode>("choose");
  const [userId, setUserId] = useState<string | null>(null);
  const [extractedForm, setExtractedForm] = useState<ClientFormData | null>(null);
  const [extractedConsiderations, setExtractedConsiderations] = useState<ConsiderationEntry[] | null>(null);
  const [extractedSubData, setExtractedSubData] = useState<ExtractedSubData | undefined>();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  function handleExtracted(sp: SpExtractionResult, cp: CpExtractionResult | null) {
    setExtractedForm(extractedToFormData(sp));
    setExtractedConsiderations(extractedToConsiderations(sp));
    setExtractedSubData({
      contacts: sp.contacts,
      goals: sp.goals,
      medications: sp.medications,
      ...(cp?.services?.length ? { services: cp.services } : {}),
    });
    setMode("review");
  }

  if (!userId) return null;

  // After extraction — show pre-filled form for review
  if (mode === "review" && extractedForm && extractedConsiderations) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Review Extracted Data</h1>
        <ClientForm
          mode="create"
          userId={userId}
          initialFormData={extractedForm}
          initialConsiderationEntries={extractedConsiderations}
          fromExtraction
          extractedSubData={extractedSubData}
        />
      </div>
    );
  }

  // Manual entry
  if (mode === "manual") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setMode("choose")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Add New Client</h1>
        </div>
        <ClientForm mode="create" userId={userId} />
      </div>
    );
  }

  // Upload flow
  if (mode === "upload") {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setMode("choose")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Upload Support Plan</h1>
        </div>
        <SpUpload onExtracted={handleExtracted} />
      </div>
    );
  }

  // Choose mode
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add New Client</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setMode("manual")}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
            <PenLine className="h-10 w-10 text-primary" />
            <span className="font-medium text-lg">Enter Manually</span>
            <span className="text-sm text-muted-foreground text-center">
              Type in client data field by field
            </span>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setMode("upload")}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
            <Upload className="h-10 w-10 text-primary" />
            <span className="font-medium text-lg">Upload Support Plan</span>
            <span className="text-sm text-muted-foreground text-center">
              Auto-extract client data from SP PDF
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
