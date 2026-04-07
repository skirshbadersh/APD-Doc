"use client";

import { useState, useRef, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SpExtractionResult } from "@/lib/claude/extract-sp";
import type { CpExtractionResult } from "@/lib/claude/extract-cp";

interface SpUploadProps {
  onExtracted: (sp: SpExtractionResult, cp: CpExtractionResult | null) => void;
}

function DropZone({
  label,
  file,
  onFile,
  onClear,
  required,
}: {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") onFile(f);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-4">
        <FileText className="h-8 w-8 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </p>
      <p className="text-xs text-muted-foreground">
        Drag &amp; drop a PDF or click to browse
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:application/pdf;base64, prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SpUpload({ onExtracted }: SpUploadProps) {
  const [spFile, setSpFile] = useState<File | null>(null);
  const [cpFile, setCpFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    if (!spFile) return;
    setLoading(true);
    setError(null);

    try {
      // Extract SP (required)
      setProgress("Extracting Support Plan data...");
      const spBase64 = await fileToBase64(spFile);
      const spRes = await fetch("/api/extract-sp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_base64: spBase64 }),
      });

      if (!spRes.ok) {
        const err = await spRes.json();
        throw new Error(err.error || "SP extraction failed");
      }

      const spData: SpExtractionResult = await spRes.json();

      // Extract CP (optional)
      let cpData: CpExtractionResult | null = null;
      if (cpFile) {
        setProgress("Extracting Cost Plan data...");
        const cpBase64 = await fileToBase64(cpFile);
        const cpRes = await fetch("/api/extract-cp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf_base64: cpBase64 }),
        });

        if (cpRes.ok) {
          cpData = await cpRes.json();
        }
        // CP errors are non-fatal — just skip
      }

      onExtracted(spData, cpData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium mb-2">Support Plan PDF <span className="text-destructive">*</span></p>
          <DropZone
            label="Support Plan PDF"
            file={spFile}
            onFile={setSpFile}
            onClear={() => setSpFile(null)}
            required
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Cost Plan PDF <span className="text-muted-foreground">(optional)</span></p>
          <DropZone
            label="Cost Plan PDF"
            file={cpFile}
            onFile={setCpFile}
            onClear={() => setCpFile(null)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleExtract}
          disabled={!spFile || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {progress || "Extracting..."}
            </>
          ) : (
            "Extract Data"
          )}
        </Button>
        {loading && (
          <p className="text-sm text-muted-foreground">
            This may take 10-15 seconds...
          </p>
        )}
      </div>
    </div>
  );
}
