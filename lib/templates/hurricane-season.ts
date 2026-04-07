import type { TemplateContext } from "./types";
import {
  firstName, he, He, him, his,
  lgName, lgFirstName,
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
  const providers = getProviderList(ctx.contacts);
  const serviceList = getServiceList(ctx.services);
  const date = fmtDate(ctx.noteDate);

  const header = noteHeader(ctx.noteDate, "TC");
  const comm = getCommunicationBlock(ctx, true);
  const evac = getEvacuationBlock(ctx);

  const sections: string[] = [];

  sections.push(`${header} WSC contacted ${lgFirst} via telephone to discuss hurricane season preparedness for ${name}. ${comm}`);

  sections.push(`WSC informed ${lgFirst} that hurricane season begins June 1st and ends November 30th. WSC discussed the importance of having an updated emergency/disaster plan in place for ${name}.`);

  sections.push(`WSC reviewed ${name}'s Personal Disaster Plan with ${lgFirst}. The following was discussed:`);

  sections.push(`EVACUATION PLAN: ${evac} ${lgFirst} confirmed that ${he(c)} has an evacuation plan in place and knows the designated evacuation routes and shelter locations.`);

  sections.push(`EMERGENCY SUPPLIES: WSC reminded ${lgFirst} to maintain an emergency supply kit that includes at least a 3-day supply of water (one gallon per person per day), non-perishable food, medications, first aid supplies, flashlight, batteries, important documents in a waterproof container, and any special items ${name} may need.`);

  sections.push(`MEDICATIONS: WSC reminded ${lgFirst} to ensure an adequate supply of ${name}'s medications is available and to contact ${name}'s pharmacy and physician before a storm to obtain additional supplies if needed.`);

  sections.push(`SERVICE PROVIDERS: WSC informed ${lgFirst} that in the event of a hurricane or natural disaster, service providers (${providers}) should be contacted to coordinate service delivery. Providers may need to modify or temporarily suspend services during an emergency. ${lgFirst} was advised to maintain a list of emergency contact numbers for all providers.`);

  sections.push(`SPECIAL NEEDS REGISTRY: WSC reminded ${lgFirst} about the Special Needs Registry and encouraged ${him(ctx.client)} to register with the local emergency management office if not already registered. This registry helps emergency responders identify individuals who may need additional assistance during an evacuation.`);

  sections.push(`WSC reminded ${lgFirst} to monitor local news and weather reports and follow instructions from local emergency management officials. ${lgFirst} confirmed understanding of all hurricane preparedness information discussed. WSC will continue to monitor the situation throughout hurricane season and provide updates as needed.`);

  return sections.join("\n\n");
}
