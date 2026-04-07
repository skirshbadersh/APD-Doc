import type { TemplateContext } from "./types";
import {
  firstName, he, He, him, his,
  lgName, lgFirstName, clientAndLg,
  getProviderList, getServiceList,
  has,
  fmtDate, noteHeader,
  getCommunicationBlock, getEvacuationBlock,
  lines,
} from "./helpers";

export function generateHurricaneSeason(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const lg = lgName(ctx.contacts);
  const lgFirst = lgFirstName(ctx.contacts);
  const opener = clientAndLg(c, ctx.contacts);
  const providers = getProviderList(ctx.contacts);
  const serviceList = getServiceList(ctx.services);
  const date = fmtDate(ctx.noteDate);

  const header = noteHeader(ctx.noteDate, "TC");
  const comm = getCommunicationBlock(ctx, true);
  const evac = getEvacuationBlock(ctx);

  const sections: string[] = [];

  sections.push(`${header} Telephone contact with ${opener} to discuss hurricane season preparedness for ${name}. ${comm}`);

  sections.push(`WSC informed ${name} and ${lgFirst} that hurricane season begins June 1st and ends November 30th. WSC discussed the importance of having an updated emergency/disaster plan in place for ${name}.`);

  sections.push(`WSC reviewed ${name}'s Personal Disaster Plan with ${name} and ${lgFirst}. The following was discussed:`);

  sections.push(`EVACUATION PLAN: ${evac} ${name} and ${lgFirst} confirmed that an evacuation plan is in place and that ${lgFirst} knows the designated evacuation routes and shelter locations.`);

  sections.push(`EMERGENCY SUPPLIES: WSC reminded ${name} and ${lgFirst} to maintain an emergency supply kit that includes at least a 3-day supply of water (one gallon per person per day), non-perishable food, medications, first aid supplies, flashlight, batteries, important documents in a waterproof container, and any special items ${name} may need.`);

  sections.push(`MEDICATIONS: WSC reminded ${name} and ${lgFirst} to ensure an adequate supply of ${name}'s medications is available and to contact ${name}'s pharmacy and physician before a storm to obtain additional supplies if needed.`);

  sections.push(`SERVICE PROVIDERS: WSC informed ${name} and ${lgFirst} that in the event of a hurricane or natural disaster, service providers (${providers}) should be contacted to coordinate service delivery. Providers may need to modify or temporarily suspend services during an emergency. ${name} and ${lgFirst} were advised to maintain a list of emergency contact numbers for all providers.`);

  sections.push(`SPECIAL NEEDS REGISTRY: WSC reminded ${name} and ${lgFirst} about the Special Needs Registry and encouraged registration with the local emergency management office if not already registered. This registry helps emergency responders identify individuals who may need additional assistance during an evacuation.`);

  sections.push(`WSC reminded ${name} and ${lgFirst} to monitor local news and weather reports and follow instructions from local emergency management officials. ${name} and ${lgFirst} confirmed understanding of all hurricane preparedness information discussed. WSC will continue to monitor the situation throughout hurricane season and provide updates as needed.`);

  return sections.join("\n\n");
}
