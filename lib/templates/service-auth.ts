import type { TemplateContext } from "./types";
import {
  firstName,
  getServiceProviderPairs,
  fmtDate, noteHeader,
} from "./helpers";

export function generateServiceAuth(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const date = fmtDate(ctx.noteDate);
  const servicePairs = getServiceProviderPairs(ctx.services);

  const header = noteHeader(ctx.noteDate, "ADM");

  const sections: string[] = [];

  sections.push(`${header} Upon approval of cost plan for the new fiscal year, WSC distributed service authorizations to providers for ${name}.`);

  sections.push(`Service authorizations were sent to the following providers: ${servicePairs}.`);

  sections.push(`All providers were notified of the approved units, rates, and service dates for the new fiscal year. Providers were instructed to deliver services in accordance with the approved support plan and cost plan.`);

  sections.push(`WSC will follow up with providers to confirm receipt of service authorizations and to address any questions or concerns regarding the new authorizations.`);

  return sections.join("\n\n");
}
