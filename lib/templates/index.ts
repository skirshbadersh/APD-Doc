import type { NoteCategory } from "@/lib/types/database";
import type { TemplateFunction } from "./types";
import { generateMonthlyTC } from "./monthly-tc";
import { generateMonthlyFF } from "./monthly-ff";
import { generateQuarterlyReview } from "./quarterly-review";
import { generateHurricaneSeason } from "./hurricane-season";
import { generateServiceAuth } from "./service-auth";
import { generatePreSP } from "./pre-sp";
import { generateSPMeeting } from "./sp-meeting";
import { generateSPDelivery } from "./sp-delivery";

/**
 * Template registry mapping note_category to template function.
 * Categories not listed here (provider_contact, cdc_related, custom, etc.)
 * don't have templates — they use the manual/custom note flow.
 */
export const templateRegistry: Partial<Record<NoteCategory, TemplateFunction>> = {
  monthly_tc: generateMonthlyTC,
  monthly_ff: generateMonthlyFF,
  quarterly_provider_review: generateQuarterlyReview,
  hurricane_season: generateHurricaneSeason,
  service_auth_new_fy: generateServiceAuth,
  pre_sp_activities: generatePreSP,
  sp_meeting_ff: generateSPMeeting,
  sp_delivery: generateSPDelivery,
};

/**
 * Generate note text for a given category.
 * Returns null if no template exists for the category.
 */
export function generateNote(
  category: NoteCategory,
  ...args: Parameters<TemplateFunction>
): string | null {
  const fn = templateRegistry[category];
  if (!fn) return null;
  return fn(...args);
}

/**
 * Check if a category has a template available.
 */
export function hasTemplate(category: NoteCategory): boolean {
  return category in templateRegistry;
}
