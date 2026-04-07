import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getSpYear(spEffectiveDate: string | Date): string {
  const date = new Date(spEffectiveDate);
  const startYear = date.getFullYear();
  return `${startYear}-${startYear + 1}`;
}
