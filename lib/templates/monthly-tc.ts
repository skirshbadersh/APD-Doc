import type { TemplateContext } from "./types";
import {
  firstName, fullName,
  lgFirstName, clientAndLg,
  noteHeader,
  getCommunicationBlock,
  getSlotTopics, renderFocusTopic,
} from "./helpers";

export function generateMonthlyTC(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const lgFirst = lgFirstName(ctx.contacts);
  const opener = ctx.contactWith || clientAndLg(c, ctx.contacts);

  const header = noteHeader(ctx.noteDate, "TC");
  const comm = getCommunicationBlock(ctx, true);
  const topics = getSlotTopics(ctx.monthInSpYear, ctx.contactSlot);

  const sections: string[] = [];

  // 1. OPENER — client always named first
  sections.push(`${header} Telephone contact with ${opener} to monitor ${name}'s **health and wellbeing**. ${comm}`);

  // 2. BRIEF HEALTH CHECK — client as co-participant
  sections.push(`Regarding **health**, ${name} and ${lgFirst} reported ${name} to be in stable physical, mental, and behavioral health. WSC reviewed current medications with ${name} and ${lgFirst}. No changes reported since the last contact.`);

  // 3. FOCUS TOPICS from slot-specific rotation
  if (topics.length > 0) {
    for (const topic of topics) {
      sections.push(renderFocusTopic(topic, ctx));
    }
  } else {
    sections.push(`WSC discussed ${name}'s current **services and supports** with ${name} and ${lgFirst}. ${name} and ${lgFirst} confirmed services continue to meet ${name}'s needs and are being delivered as authorized. No changes to services or providers were requested. WSC reminded ${name} and ${lgFirst} to contact WSC if any needs arise between scheduled contacts.`);

    sections.push(`WSC discussed **${name}'s daily activities and wellbeing** with ${name} and ${lgFirst}. ${name} and ${lgFirst} reported ${name} maintains a consistent routine and appears content. No concerns regarding ${name}'s overall quality of life were identified during this contact.`);
  }

  // 4. CLOSER
  sections.push(`No other issues or concerns during this contact. WSC will continue monitoring ${name}'s health, services and wellbeing.`);

  return sections.join("\n\n");
}
