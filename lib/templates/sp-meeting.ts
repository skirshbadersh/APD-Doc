import type { TemplateContext } from "./types";
import {
  firstName, fullName, he, He, him, his, himself,
  lgName, lgFirstName, lgRelationship,
  getProviderList, getServiceList, getServiceProviderPairs,
  has, getDetail,
  fmtDate, noteHeader,
  getMedList, getMedPurposeList, getActiveGoals,
  getCommunicationBlock, getDMEBlock, getEvacuationBlock,
  getHealthBlock, getSafetyBlock,
  lines,
} from "./helpers";

export function generateSPMeeting(ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const lg = lgName(ctx.contacts);
  const lgFirst = lgFirstName(ctx.contacts);
  const lgRel = lgRelationship(ctx.contacts, c);
  const providers = getProviderList(ctx.contacts);
  const serviceList = getServiceList(ctx.services);
  const servicePairs = getServiceProviderPairs(ctx.services);
  const meds = getMedList(ctx.medications);
  const goals = getActiveGoals(ctx.goals);
  const date = fmtDate(ctx.noteDate);
  const wsc = ctx.profile.full_name || "WSC";
  const qo = ctx.profile.qo_name || "Qualified Organization";

  const comm = getCommunicationBlock(ctx, false);
  const dme = getDMEBlock(ctx);
  const evac = getEvacuationBlock(ctx);
  const health = getHealthBlock(ctx);
  const safety = getSafetyBlock(ctx);

  const header = noteHeader(ctx.noteDate, "FF");

  const sections: string[] = [];

  // Opening
  sections.push(`${header} Support plan meeting After asking for the most convenient moment to hold the planning meeting, the planning meeting for ${name}'s Person Centered Support Plan was held on ${date}. ${comm}`);

  // Health Monitoring
  sections.push(`HEALTH MONITORING: ${health} WSC discussed with ${lgFirst} the importance of maintaining regular medical and dental appointments. ${name}'s primary care physician is managing ${his(c)} ongoing medical needs. All medications are being administered as prescribed.`);

  // Service Satisfaction
  sections.push(`SERVICE SATISFACTION: WSC discussed with ${lgFirst} current satisfaction with services. ${lgFirst} reports satisfaction with ${servicePairs}. WSC reviewed documentation from providers and confirmed services are being delivered as authorized. ${lgFirst} was reminded that if at any time ${he(c)} is dissatisfied with any provider or service, ${he(c)} has the right to request a change.`);

  // Natural/Generic Supports
  sections.push(`NATURAL AND GENERIC SUPPORTS: WSC discussed natural and generic supports available to ${name}. ${He(c)} receives natural support from ${his(c)} family. WSC encouraged the continued use of natural and generic supports to complement waiver services.`);

  // SP Development
  sections.push(`SUPPORT PLAN DEVELOPMENT: WSC developed the Person Centered Support Plan based on input from ${name} and ${lgFirst}. The SP addresses ${name}'s needs, preferences, and desired outcomes. All required sections have been completed and reflect person-centered planning principles.`);

  // Cost Plan Review
  sections.push(`COST PLAN REVIEW: WSC reviewed the current cost plan with ${lgFirst}. Current services include: ${servicePairs}. WSC confirmed all services are within the approved budget allocation and are being utilized appropriately.`);

  // HIPAA
  sections.push(`HIPAA: WSC reviewed HIPAA regulations with ${lgFirst}. ${lgFirst} was informed about ${name}'s rights regarding the privacy and security of ${his(c)} protected health information. ${lgFirst} understands how ${name}'s information is used and shared for treatment, payment, and health care operations.`);

  // Health Screening
  sections.push(`HEALTH SCREENING: WSC reviewed ${name}'s health screening information. ${name} is ${c.height || "N/A"} tall and weighs ${c.weight || "N/A"} lbs. ${c.allergies ? `Allergies: ${c.allergies}.` : "No known allergies."} Current medications: ${meds}.`);

  // Home Safety Observation
  sections.push(`HOME SAFETY OBSERVATION: During this FF contact, WSC observed the home environment. The home appeared clean, safe, and well-maintained. Adequate food and supplies were observed. ${name}'s living area is appropriate for ${his(c)} needs. No safety hazards were identified during this visit.`);

  // DME Check
  sections.push(`DME CHECK: ${dme}`);

  // Goal Identification
  if (goals.length > 0) {
    const goalSection = goals
      .map((g, i) => `Goal ${i + 1}: "${g.goal_text}"${g.service_supporting ? ` (supported by: ${g.service_supporting})` : ""}`)
      .join(". ");
    sections.push(`GOAL IDENTIFICATION: WSC reviewed ${name}'s personal goals with ${lgFirst}. ${goalSection}. WSC will continue to monitor progress toward these goals and update the support plan as needed.`);
  } else {
    sections.push(`GOAL IDENTIFICATION: WSC discussed personal goals with ${name} and ${lgFirst}. Goals have been identified and documented in the support plan. WSC will continue to monitor progress and update as needed.`);
  }

  // Informed Choice
  sections.push(`INFORMED CHOICE: WSC discussed informed choice with ${lgFirst}. ${lgFirst} was informed of ${name}'s right to choose ${his(c)} own providers, services, and how ${he(c)} wants to live ${his(c)} life. ${lgFirst} understands that ${name} can change providers or services at any time.`);

  // Waiver vs Institutional
  sections.push(`WAIVER VS INSTITUTIONAL: WSC discussed the benefits of receiving services in the community versus an institutional setting. ${lgFirst} expressed ${his(c)} desire for ${name} to continue receiving home and community-based services. ${lgFirst} understands the options available and chooses to continue with waiver services.`);

  // Employment
  sections.push(`EMPLOYMENT: WSC discussed employment options and opportunities with ${lgFirst}. ${name}'s current employment status and any changes were reviewed. WSC provided information about available employment support services.`);

  // Residential Options
  sections.push(`RESIDENTIAL OPTIONS: WSC discussed residential options with ${lgFirst}. ${name} currently resides in a ${c.living_setting?.replace(/_/g, " ") || "family home"}. ${lgFirst} is satisfied with the current living arrangement and expressed no desire for changes at this time.`);

  // ANE Review
  sections.push(`ABUSE, NEGLECT, AND EXPLOITATION (ANE) REVIEW: WSC reviewed abuse, neglect, and exploitation education with ${lgFirst}. ${lgFirst} was reminded of the signs of ANE and how to report suspected abuse to the Florida Abuse Hotline at 1-800-962-2873. ${lgFirst} confirmed understanding of ${his(c)} responsibility to report any suspected ANE. WSC observed no signs of abuse, neglect, or exploitation during this visit.`);

  // Safety/Emergency Preparedness
  sections.push(`SAFETY AND EMERGENCY PREPAREDNESS: ${safety} WSC reviewed ${name}'s emergency and disaster preparedness plan with ${lgFirst}. ${evac} ${lgFirst} was reminded to keep emergency supplies and important documents readily accessible.`);

  // Community Involvement
  sections.push(`COMMUNITY INVOLVEMENT: WSC discussed ${name}'s participation in community activities and integration. ${name} participates in community activities with the support of ${his(c)} family and service providers. WSC encouraged continued community involvement and exploration of additional opportunities.`);

  // Policies
  sections.push(`POLICIES: WSC reviewed the following policies with ${lgFirst}: grievance/complaint procedure, agency disciplinary policy, code of ethics, and consumer satisfaction survey. ${lgFirst} was provided with information on how to file a complaint or grievance if needed. ${lgFirst} was invited to complete the consumer satisfaction survey.`);

  // iBudget Education
  sections.push(`iBUDGET EDUCATION: WSC reviewed the iBudget waiver program with ${lgFirst}, including ${name}'s current budget allocation, service utilization, and the importance of using services within the authorized amounts. ${lgFirst} understands the budgeting process and the impact of service changes on the overall budget.`);

  // Preventive Healthcare
  sections.push(`PREVENTIVE HEALTHCARE: WSC discussed preventive healthcare with ${lgFirst}, including the importance of regular medical checkups, dental visits, and age-appropriate health screenings. ${lgFirst} was encouraged to maintain ${name}'s preventive healthcare schedule.`);

  // Observation of Caregiver
  sections.push(`OBSERVATION OF CAREGIVER: During this visit, WSC observed that ${lgFirst} is providing appropriate care and support to ${name}. ${lgFirst} appears capable and engaged in ${name}'s care. No concerns regarding caregiver capacity were identified.`);

  // Continuation of Services
  sections.push(`CONTINUATION OF SERVICES: Based on the review conducted during this support plan meeting, WSC recommends the continuation of all current waiver services for ${name}. The services continue to meet ${name}'s identified needs and support ${his(c)} health, safety, and wellbeing in the community.`);

  // Closing
  sections.push(`WSC thanked ${lgFirst} for ${his(c)} time and cooperation during the support plan meeting. WSC will complete the support plan documentation and distribute copies to ${name}, ${lgFirst}, and all service providers. The next support plan will be effective ${ctx.spYear ? ctx.spYear.split("-")[1] : "next year"}.`);

  return sections.join("\n\n");
}
