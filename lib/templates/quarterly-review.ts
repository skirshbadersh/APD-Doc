import type { TemplateContext } from "./types";
import {
  firstName,
  getServiceProviderPairs,
  fmtDate, noteHeader,
} from "./helpers";

export function generateQuarterlyReview(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const date = fmtDate(ctx.noteDate);
  const servicePairs = getServiceProviderPairs(ctx.services);

  const header = noteHeader(ctx.noteDate, ctx.contactType);

  const sections: string[] = [];

  sections.push(`${header} Revised documentation from providers for ${name}.`);

  sections.push(`WSC reviewed documentation and claims from the following service providers for ${name}: ${servicePairs}.`);

  sections.push(`WSC confirmed that services are being delivered in accordance with the approved support plan and cost plan. Claims were reviewed for accuracy and timeliness. No discrepancies were identified at this time.`);

  sections.push(`WSC will continue to monitor service delivery and provider documentation on a quarterly basis to ensure compliance and quality of services for ${name}.`);

  return sections.join("\n\n");
}
