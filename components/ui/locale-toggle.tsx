"use client";

import { useTranslation } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

export function LocaleToggle({ size = "sm" }: { size?: "sm" | "default" }) {
  const { locale, setLocale } = useTranslation();

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "xs" : "sm"}
      onClick={() => setLocale(locale === "en" ? "es" : "en")}
      className="font-mono text-xs"
    >
      {locale === "en" ? "ES" : "EN"}
    </Button>
  );
}
