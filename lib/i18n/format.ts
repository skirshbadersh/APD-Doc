import type { Locale } from "./types";

const INTL_LOCALE: Record<Locale, string> = { en: "en-US", es: "es-US" };

export function formatLocalizedDate(date: string | Date, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date + (typeof date === "string" && !date.includes("T") ? "T12:00:00" : "")) : date;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function getMonthNames(locale: Locale): string[] {
  const fmt = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: "long" });
  return Array.from({ length: 12 }, (_, i) => {
    const name = fmt.format(new Date(2025, i, 1));
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

/**
 * Returns ["", "January", "February", ...] (1-indexed, index 0 is empty)
 */
export function getMonthNames1(locale: Locale): string[] {
  return ["", ...getMonthNames(locale)];
}

export function formatLocalizedCurrency(value: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "USD",
  }).format(value);
}
