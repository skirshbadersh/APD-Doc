import type {
  Client,
  Contact,
  Service,
  Goal,
  Medication,
  ClientSpecialConsideration,
  SpecialConsideration,
  ContactType,
} from "@/lib/types/database";
import type { TemplateContext } from "./types";

// ---- Name helpers ----

export function firstName(client: Client): string {
  return client.first_name;
}

export function fullName(client: Client): string {
  return `${client.first_name} ${client.last_name}`;
}

export function he(client: Client): string {
  return client.gender === "female" ? "she" : "he";
}

export function He(client: Client): string {
  return client.gender === "female" ? "She" : "He";
}

export function him(client: Client): string {
  return client.gender === "female" ? "her" : "him";
}

export function his(client: Client): string {
  return client.gender === "female" ? "her" : "his";
}

export function himself(client: Client): string {
  return client.gender === "female" ? "herself" : "himself";
}

// ---- Contact helpers ----

export function getLegalGuardian(contacts: Contact[]): Contact | undefined {
  return contacts.find((c) => c.is_legal_rep);
}

export function lgName(contacts: Contact[]): string {
  const lg = getLegalGuardian(contacts);
  return lg ? `${lg.first_name} ${lg.last_name}` : "legal guardian";
}

export function lgFirstName(contacts: Contact[]): string {
  const lg = getLegalGuardian(contacts);
  return lg ? lg.first_name : "legal guardian";
}

export function lgRelationship(contacts: Contact[], client: Client): string {
  const lg = getLegalGuardian(contacts);
  if (!lg) return "legal guardian";
  const rel = lg.relationship || "Legal Representative";
  return `${lg.first_name} ${lg.last_name} (${client.first_name}'s ${rel})`;
}

export function getProviderList(contacts: Contact[]): string {
  const providers = contacts.filter(
    (c) => c.contact_type === "service_provider" || c.contact_type === "healthcare_provider"
  );
  if (providers.length === 0) return "service providers";
  return providers.map((p) => p.organization || `${p.first_name} ${p.last_name}`).join(", ");
}

export function getServiceList(services: Service[]): string {
  if (services.length === 0) return "waiver services";
  return services.map((s) => s.service_name).join(", ");
}

export function getServiceProviderPairs(services: Service[]): string {
  if (services.length === 0) return "waiver services from approved providers";
  return services
    .map((s) => `${s.service_name}${s.provider_name ? ` (${s.provider_name})` : ""}`)
    .join(", ");
}

// ---- Consideration helpers ----

export function has(considerations: ClientSpecialConsideration[], type: SpecialConsideration): boolean {
  return considerations.some((c) => c.consideration === type);
}

export function getDetail(considerations: ClientSpecialConsideration[], type: SpecialConsideration): string {
  return considerations.find((c) => c.consideration === type)?.details ?? "";
}

// ---- Date formatting ----

export function fmtDate(date: Date): string {
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

export function noteHeader(date: Date, contactType: ContactType): string {
  return `${fmtDate(date)} ${contactType}`;
}

// ---- Medication helpers ----

export function getMedList(medications: Medication[]): string {
  if (medications.length === 0) return "prescribed medications";
  return medications
    .map((m) => `${m.medication_name}${m.dosage_frequency ? ` (${m.dosage_frequency})` : ""}`)
    .join(", ");
}

export function getMedPurposeList(medications: Medication[]): string {
  if (medications.length === 0) return "";
  return medications
    .filter((m) => m.purpose)
    .map((m) => `${m.medication_name}: ${m.purpose}`)
    .join("; ");
}

// ---- Goal helpers ----

export function getActiveGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => g.status === "active");
}

export function getGoalSummary(goals: Goal[]): string {
  const active = getActiveGoals(goals);
  if (active.length === 0) return "personal goals";
  return active.map((g) => g.goal_text).join("; ");
}

// ---- Conditional blocks ----

export function getCommunicationBlock(ctx: TemplateContext, isCall: boolean): string {
  const c = ctx.client;
  const lg = lgName(ctx.contacts);

  if (has(ctx.considerations, "nonverbal")) {
    return isCall
      ? `${lg} assisted WSC with needed information for this contact as ${firstName(c)} communicates non-verbally. WSC gathered information about ${firstName(c)}'s health, wellbeing, and services through ${lgFirstName(ctx.contacts)}.`
      : `${lg} assisted WSC with needed information for this contact as ${firstName(c)} communicates non-verbally. WSC observed ${firstName(c)}'s body language and behavioral cues indicating happiness and wellbeing.`;
  }

  if (has(ctx.considerations, "limited_verbal")) {
    const detail = has(ctx.considerations, "hearing_impaired")
      ? `${firstName(c)} has difficulties with hearing and ${lgFirstName(ctx.contacts)} helped with communications ${isCall ? "over the call" : "during the visit"}`
      : `${firstName(c)} has difficulties with speech and ${lgFirstName(ctx.contacts)} helped with communications ${isCall ? "over the call" : "during the visit"}`;
    return `${firstName(c)} and ${lg} assisted WSC with needed information for this contact. ${firstName(c)} showed signs of happiness and wellbeing during this contact. ${detail}.`;
  }

  if (has(ctx.considerations, "hearing_impaired")) {
    return `${lg} assisted WSC with needed information for this contact. ${lgFirstName(ctx.contacts)} helped with communications ${isCall ? "over the call" : "during the visit"} as ${firstName(c)} has hearing difficulties. ${firstName(c)} showed signs of happiness and wellbeing during this contact.`;
  }

  return `${firstName(c)} assisted WSC with needed information for this contact. ${firstName(c)} showed signs of happiness and wellbeing during this contact.`;
}

export function getDMEBlock(ctx: TemplateContext): string {
  const c = ctx.client;
  if (has(ctx.considerations, "no_dme")) {
    return "No DME for this consumer.";
  }
  if (has(ctx.considerations, "uses_dme")) {
    const detail = getDetail(ctx.considerations, "uses_dme");
    return `During this FF contact, WSC checked DME condition. ${detail || "DME in use"}. No need of repair/replacement at this time.`;
  }
  return "WSC checked for any DME needs. No DME currently in use for this consumer.";
}

export function getEvacuationBlock(ctx: TemplateContext): string {
  const c = ctx.client;
  if (has(ctx.considerations, "wheelchair")) {
    return `${firstName(c)} may need physical assistance and accessible transportation to evacuate. ${firstName(c)} uses a wheelchair and evacuation routes and shelter must be wheelchair accessible.`;
  }
  if (has(ctx.considerations, "bedbound")) {
    return `${firstName(c)} requires full physical assistance to evacuate including specialized medical transport.`;
  }
  if (has(ctx.considerations, "walker")) {
    return `${firstName(c)} may need physical assistance and accessible transportation to evacuate. ${firstName(c)} uses a walker and evacuation routes must be accessible.`;
  }
  return `${firstName(c)} may not recognize the circumstances under which to evacuate and would need one to one supervision, guidance, and constant physical assistance.`;
}

export function getHealthBlock(ctx: TemplateContext): string {
  const c = ctx.client;
  const meds = getMedList(ctx.medications);
  const lines: string[] = [];

  lines.push(`WSC discussed ${firstName(c)}'s overall health and wellbeing.`);

  if (c.allergies) {
    lines.push(`Allergies: ${c.allergies}.`);
  }

  lines.push(`${firstName(c)} is currently taking ${meds}.`);

  if (has(ctx.considerations, "choking_risk")) {
    lines.push(`${firstName(c)} has a choking risk and requires meal supervision.`);
  }
  if (has(ctx.considerations, "sleep_apnea")) {
    const detail = getDetail(ctx.considerations, "sleep_apnea");
    lines.push(`${firstName(c)} has sleep apnea and uses ${detail || "a CPAP/ResMed machine"}. Equipment is in working condition.`);
  }
  if (has(ctx.considerations, "special_diet")) {
    lines.push(`${firstName(c)} has a special diet in place due to medical conditions.`);
  }
  if (has(ctx.considerations, "compression_socks")) {
    lines.push(`${firstName(c)} uses compression socks as part of ${his(c)} daily routine.`);
  }

  return lines.join(" ");
}

export function getSafetyBlock(ctx: TemplateContext): string {
  const c = ctx.client;
  const lines: string[] = [];
  if (has(ctx.considerations, "gullible_vulnerable")) {
    lines.push(`${firstName(c)} must be accompanied by a competent adult at all times due to ${his(c)} vulnerability.`);
  }
  if (has(ctx.considerations, "self_injurious")) {
    const detail = getDetail(ctx.considerations, "self_injurious");
    lines.push(`${firstName(c)} exhibits self-injurious behavior${detail ? ` (${detail})` : ""}. Circle of support monitors and redirects as needed.`);
  }
  if (c.disaster_plan_date) {
    lines.push(`Personal disaster plan is current (last updated ${c.disaster_plan_date}).`);
  }
  return lines.length > 0 ? lines.join(" ") : `Safety assessment reviewed. No current safety concerns identified.`;
}

// ---- Month-in-SP-year ----

/**
 * Calculate which month within the SP year (1-12) a note falls in.
 * Month 1 = the SP effective month itself.
 */
export function getMonthInSpYear(noteDate: Date, spEffectiveDate: string | null): number {
  if (!spEffectiveDate) return 1;
  const spMonth = new Date(spEffectiveDate + "T12:00:00").getMonth(); // 0-indexed
  const noteMonth = noteDate.getMonth(); // 0-indexed
  return ((noteMonth - spMonth + 12) % 12) + 1;
}

// ---- Topic rotation for monthly TC/FF ----

export type FocusTopic =
  | "service_satisfaction"
  | "goal_progress"
  | "choose_services_providers"
  | "medication_education"
  | "daily_routines"
  | "community_integration"
  | "bill_of_rights"
  | "satisfaction_personal_life"
  | "health_deep_dive"
  | "ane_education"
  | "safety_discussion"
  | "natural_community_supports"
  | "developing_resources"
  | "choose_where_to_live"
  | "choose_to_work"
  | "informed_choice"
  | "qsi_education"
  | "people_treated_fairly"
  | "inclusion"
  | "healthcare_provider_satisfaction"
  | "hipaa_privacy";

const ROTATION_SCHEDULE: Record<number, FocusTopic[]> = {
  1: ["service_satisfaction", "goal_progress", "choose_services_providers"],
  2: ["medication_education", "daily_routines", "community_integration"],
  3: ["bill_of_rights", "satisfaction_personal_life"],
  4: ["health_deep_dive", "ane_education", "safety_discussion"],
  5: ["natural_community_supports", "developing_resources"],
  6: ["choose_where_to_live", "choose_to_work", "informed_choice"],
  7: ["qsi_education", "service_satisfaction", "goal_progress"],
  8: ["community_integration", "people_treated_fairly", "inclusion"],
  9: ["medication_education", "healthcare_provider_satisfaction"],
  10: ["bill_of_rights", "ane_education", "hipaa_privacy"],
  11: ["service_satisfaction", "goal_progress"],
  12: ["community_integration", "natural_community_supports"],
};

export function getRotationTopics(monthInSpYear: number): FocusTopic[] {
  return ROTATION_SCHEDULE[monthInSpYear] || ROTATION_SCHEDULE[1];
}

/**
 * Split the month's rotation topics between contact slots 1 and 2.
 * Slot 1 gets the first half, slot 2 gets the second half.
 * If a slot would end up with 0 topics, it gets a supplemental topic.
 */
export function getSlotTopics(monthInSpYear: number, slot: 1 | 2): FocusTopic[] {
  const all = getRotationTopics(monthInSpYear);
  if (all.length <= 1) {
    // Only 1 topic — slot 1 gets it, slot 2 gets a supplemental
    return slot === 1 ? all : [];
  }
  const mid = Math.ceil(all.length / 2);
  return slot === 1 ? all.slice(0, mid) : all.slice(mid);
}

/**
 * Generate a focus topic paragraph for a TC or FF note.
 * Each returns 3-6 sentences with the compliance keyword bolded.
 */
export function renderFocusTopic(topic: FocusTopic, ctx: TemplateContext): string {
  const c = ctx.client;
  const name = firstName(c);
  const lgFirst = lgFirstName(ctx.contacts);
  const goals = getActiveGoals(ctx.goals);
  const goalSnippet = goals.length > 0 ? goals[0].goal_text : null;
  const svc = ctx.services.length > 0 ? ctx.services[0].service_name : null;
  const provider = ctx.services.length > 0 ? ctx.services[0].provider_name : null;

  switch (topic) {
    case "service_satisfaction":
      return `WSC discussed **service satisfaction** with ${lgFirst}. ${lgFirst} reports ${name} continues to receive services as authorized and is satisfied with current service delivery${svc ? `, including ${svc}` : ""}. ${lgFirst} expressed no complaints or concerns regarding service providers. WSC reminded ${lgFirst} that ${he(c)} has the right to request a change in providers at any time if dissatisfied.`;

    case "goal_progress":
      return goalSnippet
        ? `WSC discussed **progress toward support plan goals** with ${lgFirst}. ${name}'s current goal includes "${goalSnippet}." ${lgFirst} reports ${name} continues to make progress and is engaged in activities that support this goal. WSC will continue to monitor and provide support as needed.`
        : `WSC discussed **progress toward support plan goals** with ${lgFirst}. ${lgFirst} reports ${name} is doing well and continuing to work toward ${his(c)} personal goals. WSC encouraged continued progress and will monitor at the next contact.`;

    case "choose_services_providers":
      return `WSC provided **ongoing education on the right to choose services and providers**. ${lgFirst} was reminded that ${name} has the right to choose ${his(c)} own service providers, to change providers at any time, and to participate in decisions about ${his(c)} services. ${lgFirst} confirmed understanding and expressed satisfaction with current provider arrangements.`;

    case "medication_education":
      return `WSC discussed **medication management** with ${lgFirst}. WSC reviewed current medications with ${lgFirst}. No changes reported since the last contact. ${lgFirst} confirmed medications are being administered as prescribed. WSC reminded ${lgFirst} of the importance of following up with ${name}'s physician regarding any side effects or concerns.`;

    case "daily_routines":
      return `WSC discussed ${name}'s **daily routines and activities**. ${lgFirst} reports ${name} maintains a consistent daily routine and participates in household and personal care activities${has(ctx.considerations, "low_intellectual_disability") ? " with appropriate support and simplified instructions" : ""}. ${name} appears comfortable with ${his(c)} current schedule. No changes to daily routines were reported.`;

    case "community_integration":
      return `WSC discussed **community integration** and ${name}'s participation in community activities. ${lgFirst} reports ${name} continues to participate in community outings and activities with support from ${his(c)} circle of support. WSC encouraged continued exploration of community resources and activities that align with ${name}'s interests and preferences.`;

    case "bill_of_rights":
      return `WSC provided **ongoing education on the Bill of Rights** for persons with developmental disabilities. WSC reviewed key rights including the right to dignity, privacy, freedom from abuse and neglect, and the right to participate in decisions affecting ${his(c)} life. ${lgFirst} confirmed understanding and acknowledged that ${name}'s rights are being respected in ${his(c)} current living arrangement.`;

    case "satisfaction_personal_life":
      return `WSC discussed **satisfaction with personal life** with ${lgFirst}. ${lgFirst} reports ${name} appears happy and content with ${his(c)} current living situation, relationships, and daily activities. ${name} showed signs of happiness and wellbeing during this contact. No concerns regarding ${name}'s overall quality of life were identified.`;

    case "health_deep_dive":
      return `WSC conducted a **health and wellbeing** review with ${lgFirst}. ${lgFirst} reports ${name} has been in stable physical, mental, and behavioral health. ${name} continues to attend scheduled medical and dental appointments. ${c.allergies ? `Allergies (${c.allergies}) remain unchanged.` : "No known allergies."} WSC reminded ${lgFirst} of the importance of maintaining regular preventive healthcare screenings and reporting any health changes promptly.`;

    case "ane_education":
      return `WSC provided **ongoing education on abuse, neglect, and exploitation (ANE)**. WSC reviewed the signs of abuse, neglect, and exploitation with ${lgFirst} and reminded ${him(c)} of the obligation to report any suspected ANE to the Florida Abuse Hotline at 1-800-962-2873. ${lgFirst} confirmed understanding and stated there are no current ANE concerns. WSC observed no signs of abuse, neglect, or exploitation.`;

    case "safety_discussion":
      return `WSC discussed **safety and emergency preparedness** with ${lgFirst}. ${getSafetyBlock(ctx)} WSC reminded ${lgFirst} to keep emergency supplies and important documents accessible and to review the emergency plan periodically. ${lgFirst} confirmed the personal disaster plan is current.`;

    case "natural_community_supports":
      return `WSC discussed **natural and community supports** available to ${name}. ${lgFirst} reports ${name} continues to receive natural support from family members. WSC encouraged the continued use of natural and generic supports to complement waiver services and promote independence. WSC discussed community resources that may be available to ${name}.`;

    case "developing_resources":
      return `WSC discussed **developing resources** and additional supports that may benefit ${name}. WSC explored whether any additional community resources, programs, or services could support ${name}'s goals and wellbeing. ${lgFirst} expressed interest in learning about available resources. WSC will follow up with information on applicable programs.`;

    case "choose_where_to_live":
      return `WSC discussed **the right to choose where to live** with ${lgFirst}. ${lgFirst} was informed that ${name} has the right to choose ${his(c)} living arrangement and that options are available if a change is desired. ${lgFirst} confirmed satisfaction with ${name}'s current living situation in ${his(c)} ${c.living_setting?.replace(/_/g, " ") || "family home"} and expressed no desire for changes at this time.`;

    case "choose_to_work":
      return `WSC discussed **the right to choose to work** and employment opportunities with ${lgFirst}. WSC informed ${lgFirst} that ${name} has the right to explore employment options and that employment support services are available through the waiver. ${lgFirst} acknowledged this information and discussed ${name}'s current interests and activities.`;

    case "informed_choice":
      return `WSC discussed **informed choice** with ${lgFirst}. ${lgFirst} was reminded that ${name} has the right to make informed decisions about ${his(c)} services, providers, and daily life. WSC confirmed that ${lgFirst} understands the options available and that choices are being made in ${name}'s best interest with ${his(c)} input and preferences considered.`;

    case "qsi_education":
      return `WSC provided **education on the Questionnaire for Situational Information (QSI)**. WSC explained the purpose of the QSI and how it is used to assess ${name}'s needs and determine the appropriate level of support. ${lgFirst} was informed that the QSI may be updated periodically and that accurate information is essential for ensuring ${name} receives the right services.`;

    case "people_treated_fairly":
      return `WSC discussed **whether people in ${name}'s life treat ${him(c)} fairly** and with respect. ${lgFirst} reports that ${name} is treated with dignity and respect by family members, caregivers, and service providers. No concerns regarding mistreatment or unfair treatment were identified. WSC will continue to monitor ${name}'s interactions and relationships.`;

    case "inclusion":
      return `WSC discussed **inclusion** and ${name}'s participation in activities alongside people without disabilities. ${lgFirst} reports ${name} participates in inclusive community activities and has opportunities to interact with peers. WSC encouraged continued efforts to promote inclusion and meaningful community participation.`;

    case "healthcare_provider_satisfaction":
      return `WSC discussed **satisfaction with healthcare providers** with ${lgFirst}. ${lgFirst} reports satisfaction with ${name}'s primary care physician and other healthcare providers. ${name} continues to receive regular medical care and follow-up appointments are being kept. No changes to healthcare providers were requested.`;

    case "hipaa_privacy":
      return `WSC provided **education on HIPAA and privacy rights**. WSC reviewed ${name}'s rights regarding the privacy and security of ${his(c)} protected health information. ${lgFirst} was reminded of how ${name}'s information is used and shared for treatment, payment, and health care operations. ${lgFirst} confirmed understanding of ${name}'s privacy rights.`;
  }
}

// ---- Line builder ----

export function lines(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n");
}
