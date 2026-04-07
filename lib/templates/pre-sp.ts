import type { TemplateContext } from "./types";
import {
  firstName, his,
  lgName, lgFirstName, clientAndLg,
  getServiceProviderPairs, getProviderList,
  fmtDate, noteHeader,
  getCommunicationBlock,
  getActiveGoals,
} from "./helpers";

/**
 * Pre-SP Activities template.
 * Based on Qlarant Standard #21 — must include all 5 required components:
 * 1. Purpose of planning
 * 2. Review of goals
 * 3. Review of services/providers
 * 4. Meeting logistics
 * 5. Invitee discussion
 */
export function generatePreSP(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const lg = lgName(ctx.contacts);
  const lgFirst = lgFirstName(ctx.contacts);
  const opener = clientAndLg(c, ctx.contacts);
  const servicePairs = getServiceProviderPairs(ctx.services);
  const providers = getProviderList(ctx.contacts);
  const goals = getActiveGoals(ctx.goals);
  const date = fmtDate(ctx.noteDate);
  const comm = getCommunicationBlock(ctx, true);

  const sections: string[] = [];

  const header = noteHeader(ctx.noteDate, "TC");

  // Opening — client named first
  sections.push(`${header} Telephone contact with ${opener} to discuss pre-support plan activities for ${name}'s upcoming Person Centered Support Plan renewal. ${comm}`);

  // 1. Purpose of Planning
  sections.push(`PURPOSE OF PLANNING: WSC discussed the purpose of the annual support plan review with ${name} and ${lgFirst}. WSC explained that the support plan is developed to ensure ${name}'s needs, preferences, and desired outcomes are addressed through person-centered planning. The plan documents ${name}'s goals, services, and supports for the coming year.`);

  // 2. Review of Goals
  if (goals.length > 0) {
    const goalText = goals
      .map((g) => `"${g.goal_text}"`)
      .join("; ");
    sections.push(`REVIEW OF GOALS: WSC reviewed ${name}'s current goals with ${name} and ${lgFirst}: ${goalText}. WSC, ${name}, and ${lgFirst} discussed progress toward each goal and whether any goals should be modified, continued, or replaced for the new plan year. ${name} and ${lgFirst} provided input on ${name}'s current priorities and desired outcomes.`);
  } else {
    sections.push(`REVIEW OF GOALS: WSC discussed ${name}'s current and desired goals with ${name} and ${lgFirst}. WSC asked ${name} and ${lgFirst} to consider what is important to ${name} and what ${name} would like to achieve in the coming year. ${name} and ${lgFirst} will prepare thoughts on goals for the SP meeting.`);
  }

  // 3. Review of Services/Providers
  sections.push(`REVIEW OF SERVICES AND PROVIDERS: WSC reviewed ${name}'s current services and providers with ${name} and ${lgFirst}: ${servicePairs}. WSC asked ${name} and ${lgFirst} about satisfaction with each service and provider. WSC discussed whether any changes to services, providers, or authorized amounts are needed for the new plan year. ${name} and ${lgFirst} confirmed current services are meeting ${name}'s needs.`);

  // 4. Meeting Logistics
  sections.push(`MEETING LOGISTICS: WSC discussed the scheduling of the annual support plan meeting with ${name} and ${lgFirst}. WSC asked about the preferred date, time, and location for the meeting. ${name} and ${lgFirst} will confirm availability and WSC will schedule the meeting and send invitations to all participants.`);

  // 5. Invitee Discussion
  const spContacts = ctx.contacts.filter((ct) => ct.invite_to_sp_meeting);
  const inviteeNames = spContacts.length > 0
    ? spContacts.map((ct) => `${ct.first_name} ${ct.last_name}`).join(", ")
    : `${lgFirst} and relevant service providers`;
  sections.push(`INVITEE DISCUSSION: WSC discussed with ${name} and ${lgFirst} who should be invited to the support plan meeting. The following individuals were identified as invitees: ${inviteeNames}. WSC will send meeting invitations to all identified participants. ${name} is welcome and encouraged to attend ${his(c)} own planning meeting.`);

  // Closing
  sections.push(`${name} and ${lgFirst} confirmed understanding of the pre-planning activities and expressed willingness to participate in the upcoming support plan meeting. WSC will follow up to schedule the meeting and complete all pre-planning requirements.`);

  return sections.join("\n\n");
}
