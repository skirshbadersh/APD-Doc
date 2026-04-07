import type { TemplateContext } from "./types";
import {
  firstName, He, his,
  lgFirstName, clientAndLg,
  noteHeader,
  getCommunicationBlock, getDMEBlock, getSafetyBlock,
  getSlotTopics, renderFocusTopic,
} from "./helpers";

export function generateMonthlyFF(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const lgFirst = lgFirstName(ctx.contacts);
  const opener = clientAndLg(c, ctx.contacts);

  const header = noteHeader(ctx.noteDate, "FF");
  const comm = getCommunicationBlock(ctx, false);
  const dme = getDMEBlock(ctx);
  const safety = getSafetyBlock(ctx);
  const topics = getSlotTopics(ctx.monthInSpYear, ctx.contactSlot);

  const sections: string[] = [];

  // 1. OPENER — client always named first
  if (ctx.isHomeVisit) {
    sections.push(`${header} After asking for the most convenient moment, WSC conducted a face-to-face home visit with ${opener} at ${his(c)} residence to monitor ${name}'s **health and wellbeing**. ${comm}`);
  } else {
    sections.push(`${header} After asking for the most convenient moment, WSC conducted a face-to-face visit with ${opener} to monitor ${name}'s **health and wellbeing**. ${comm}`);
  }

  // 2. BRIEF HEALTH CHECK — client as co-participant
  sections.push(`Regarding **health**, ${name} and ${lgFirst} reported ${name} to be in stable physical, mental, and behavioral health. WSC reviewed current medications with ${name} and ${lgFirst}. No changes reported since the last contact.`);

  // 3. FOCUS TOPICS from slot-specific rotation
  if (topics.length > 0) {
    for (const topic of topics) {
      sections.push(renderFocusTopic(topic, ctx));
    }
  } else {
    sections.push(`WSC discussed ${name}'s current **services and supports** with ${name} and ${lgFirst}. ${name} and ${lgFirst} confirmed services continue to meet ${name}'s needs. No changes to services or providers were requested.`);
  }

  // 4. FF-SPECIFIC SECTIONS
  sections.push(`During this visit, WSC observed the home environment. The home appeared clean, safe, and well-maintained. Adequate food, water, and supplies were observed. ${name}'s personal living space is appropriate and meets ${his(c)} needs. No safety hazards were identified.`);

  sections.push(`WSC observed ${name}'s personal **grooming and hygiene**. ${He(c)} appeared well-groomed and appropriately dressed. No concerns regarding personal hygiene were noted.`);

  sections.push(dme);

  sections.push(safety);

  sections.push(`WSC observed ${lgFirst} during this visit. ${lgFirst} appears capable and engaged in providing care and support to ${name}. No concerns regarding caregiver capacity or wellbeing were identified.`);

  // 5. CLOSER
  sections.push(`No other issues or concerns during this face-to-face contact. WSC will continue monitoring ${name}'s health, services and wellbeing.`);

  return sections.join("\n\n");
}
