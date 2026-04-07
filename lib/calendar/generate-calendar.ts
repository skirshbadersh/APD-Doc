import { addMonths, subMonths, getMonth, getYear } from "date-fns";
import type {
  CoordinationType,
  LivingSetting,
  ContactType,
  NoteCategory,
  CalendarEntryStatus,
} from "@/lib/types/database";

export interface CalendarEntryInput {
  sp_year: string;
  month: number;
  year: number;
  required_contact_1_type: ContactType | null;
  required_contact_1_category: NoteCategory | null;
  required_contact_2_type: ContactType | null;
  required_contact_2_category: NoteCategory | null;
  is_ff_month: boolean;
  is_home_visit_month: boolean;
  is_provider_review_month: boolean;
  is_hurricane_month: boolean;
  is_sa_month: boolean;
  is_pre_sp_month: boolean;
  is_sp_meeting_month: boolean;
  is_sp_delivery_month: boolean;
  status: CalendarEntryStatus;
}

interface FrequencyRules {
  contactsPerMonth: number;
  ffEveryNMonths: number;
  homeVisitEveryNMonths: number;
}

function getFrequencyRules(
  coordinationType: CoordinationType,
  _livingSetting: LivingSetting
): FrequencyRules {
  switch (coordinationType) {
    case "full_home":
      return { contactsPerMonth: 2, ffEveryNMonths: 3, homeVisitEveryNMonths: 6 };
    case "full_gh":
      return { contactsPerMonth: 2, ffEveryNMonths: 1, homeVisitEveryNMonths: 3 };
    case "full_supported_living":
      return { contactsPerMonth: 2, ffEveryNMonths: 1, homeVisitEveryNMonths: 3 };
    case "limited":
      return { contactsPerMonth: 1, ffEveryNMonths: 6, homeVisitEveryNMonths: 12 };
  }
}

/**
 * Generate the full 12-month annual calendar for a client.
 *
 * FF months count from the SP effective date (month index 0, 3, 6, 9 for every-3).
 * Special months (hurricane=May, SA=June, pre-SP, SP meeting, SP delivery) are
 * layered on top.
 */
export function generateAnnualCalendar(client: {
  sp_effective_date: Date;
  coordination_type: CoordinationType;
  living_setting: LivingSetting;
}): CalendarEntryInput[] {
  const spDate = client.sp_effective_date;
  const spYear = `${getYear(spDate)}-${getYear(spDate) + 1}`;
  const rules = getFrequencyRules(client.coordination_type, client.living_setting);

  // Pre-compute SP-relative month dates
  const preSpDate = subMonths(spDate, 3); // 3 months before next SP effective
  const spMeetingDate = subMonths(spDate, 2); // 2 months before
  const spDeliveryDate = subMonths(spDate, 1); // 1 month before
  // These target the NEXT year's SP meeting cycle, so add 12 months
  const nextSpDate = addMonths(spDate, 12);
  const preSpMonth = getMonth(subMonths(nextSpDate, 3)); // 0-indexed month
  const preSpYear = getYear(subMonths(nextSpDate, 3));
  const spMeetingMonth = getMonth(subMonths(nextSpDate, 2));
  const spMeetingYear = getYear(subMonths(nextSpDate, 2));
  const spDeliveryMonth = getMonth(subMonths(nextSpDate, 1));
  const spDeliveryYear = getYear(subMonths(nextSpDate, 1));

  const entries: CalendarEntryInput[] = [];

  for (let i = 0; i < 12; i++) {
    const monthDate = addMonths(spDate, i);
    const month = getMonth(monthDate) + 1; // 1-indexed for DB
    const year = getYear(monthDate);
    const calMonth0 = getMonth(monthDate); // 0-indexed for comparison

    // Determine flags
    const is_ff_month = i % rules.ffEveryNMonths === 0;
    const is_home_visit_month = i % rules.homeVisitEveryNMonths === 0;
    const is_provider_review_month = i > 0 && i % 3 === 0; // months 3, 6, 9, 12 (not month 1)
    const is_hurricane_month = calMonth0 === 4; // May = month index 4
    const is_sa_month = calMonth0 === 5; // June = month index 5
    const is_pre_sp_month = calMonth0 === preSpMonth && year === preSpYear;
    const is_sp_meeting_month = calMonth0 === spMeetingMonth && year === spMeetingYear;
    const is_sp_delivery_month = calMonth0 === spDeliveryMonth && year === spDeliveryYear;

    // Assign contact types and categories
    let contact1Type: ContactType | null = null;
    let contact1Cat: NoteCategory | null = null;
    let contact2Type: ContactType | null = null;
    let contact2Cat: NoteCategory | null = null;

    if (rules.contactsPerMonth >= 1) {
      // Contact 1: Determine the primary contact
      if (is_sp_meeting_month) {
        contact1Type = "FF";
        contact1Cat = "sp_meeting_ff";
      } else if (is_ff_month) {
        contact1Type = "FF";
        contact1Cat = "monthly_ff";
      } else if (is_hurricane_month) {
        contact1Type = "TC";
        contact1Cat = "hurricane_season";
      } else if (is_pre_sp_month) {
        contact1Type = "TC";
        contact1Cat = "pre_sp_activities";
      } else if (is_sp_delivery_month) {
        contact1Type = "ADM";
        contact1Cat = "sp_delivery";
      } else if (is_sa_month) {
        contact1Type = "ADM";
        contact1Cat = "service_auth_new_fy";
      } else {
        contact1Type = "TC";
        contact1Cat = "monthly_tc";
      }
    }

    if (rules.contactsPerMonth >= 2) {
      // Contact 2: Fill the second slot
      // Avoid duplicating what contact 1 already covers
      if (is_sp_delivery_month && contact1Cat !== "sp_delivery") {
        contact2Type = "ADM";
        contact2Cat = "sp_delivery";
      } else if (is_sa_month && contact1Cat !== "service_auth_new_fy") {
        contact2Type = "ADM";
        contact2Cat = "service_auth_new_fy";
      } else if (is_hurricane_month && contact1Cat !== "hurricane_season") {
        contact2Type = "TC";
        contact2Cat = "hurricane_season";
      } else if (is_pre_sp_month && contact1Cat !== "pre_sp_activities") {
        contact2Type = "TC";
        contact2Cat = "pre_sp_activities";
      } else if (is_ff_month && contact1Type !== "FF") {
        // FF wasn't contact 1 (e.g., SP meeting took that slot), make it contact 2
        contact2Type = "FF";
        contact2Cat = "monthly_ff";
      } else {
        contact2Type = "TC";
        contact2Cat = "monthly_tc";
      }
    }

    entries.push({
      sp_year: spYear,
      month,
      year,
      required_contact_1_type: contact1Type,
      required_contact_1_category: contact1Cat,
      required_contact_2_type: contact2Type,
      required_contact_2_category: contact2Cat,
      is_ff_month,
      is_home_visit_month,
      is_provider_review_month,
      is_hurricane_month,
      is_sa_month,
      is_pre_sp_month,
      is_sp_meeting_month,
      is_sp_delivery_month,
      status: "pending",
    });
  }

  return entries;
}
