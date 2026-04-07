import type { TemplateContext } from "./types";
import {
  firstName, his,
  lgName, lgFirstName,
  getProviderList,
  fmtDate, noteHeader,
} from "./helpers";

export function generateSPDelivery(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const lg = lgName(ctx.contacts);
  const lgFirst = lgFirstName(ctx.contacts);
  const providers = getProviderList(ctx.contacts);
  const date = fmtDate(ctx.noteDate);

  const header = noteHeader(ctx.noteDate, "ADM");

  const sections: string[] = [];

  sections.push(`${header} After completion of SP, SP disposition changed to "WSC Approved" and distributed.`);

  sections.push(`WSC completed ${name}'s Person Centered Support Plan for the ${ctx.spYear || "current"} plan year. The SP disposition has been changed to "WSC Approved" in iConnect.`);

  sections.push(`Copies of the approved Support Plan have been distributed to: ${name}, ${lgFirst} (${his(c)} Legal Representative), and service providers (${providers}).`);

  sections.push(`All parties have been informed of the contents of the support plan, including ${name}'s goals, services, and rights. The support plan is effective and services will continue as authorized.`);

  return sections.join("\n\n");
}
