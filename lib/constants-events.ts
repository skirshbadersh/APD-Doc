import type { EventType } from "@/lib/types/database";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  address_change: "Address Change",
  living_setting_change: "Living Setting Change",
  guardian_change: "Guardian Change",
  provider_change: "Provider Change",
  service_change: "Service Change",
  hospitalization: "Hospitalization",
  health_change: "Health Change",
  behavioral_incident: "Behavioral Incident",
  goal_change: "Goal Change",
  family_change: "Family Change",
  program_change: "Program Change",
  compliance_event: "Compliance Event",
  other: "Other",
};

export const ALL_EVENT_TYPES: EventType[] = Object.keys(EVENT_TYPE_LABELS) as EventType[];
