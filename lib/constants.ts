import type { SpecialConsideration } from "@/lib/types/database";

export const CONSIDERATION_LABELS: Record<SpecialConsideration, string> = {
  nonverbal: "Nonverbal",
  limited_verbal: "Limited verbal / speech impairment",
  wheelchair: "Wheelchair user",
  bedbound: "Bedbound",
  walker: "Uses walker",
  incontinent: "Incontinent",
  hearing_impaired: "Hearing impaired",
  vision_impaired: "Vision impaired",
  low_intellectual_disability: "Low intellectual disability (needs simpler language)",
  high_functioning: "High functioning",
  minor: "Minor (under 21)",
  choking_risk: "Choking risk",
  self_injurious: "Self-injurious behavior",
  gullible_vulnerable: "Gullible / vulnerable (needs constant supervision)",
  sleep_apnea: "Sleep apnea (uses equipment)",
  compression_socks: "Uses compression socks",
  special_diet: "Special diet",
  no_dme: "No DME",
  uses_dme: "Uses DME",
};

export const ALL_CONSIDERATIONS: SpecialConsideration[] = Object.keys(
  CONSIDERATION_LABELS
) as SpecialConsideration[];

export const COORDINATION_LABELS: Record<string, string> = {
  full_home: "Full — Family Home",
  full_gh: "Full — Group Home",
  full_supported_living: "Full — Supported Living",
  limited: "Limited",
};

export const LIVING_LABELS: Record<string, string> = {
  family_home: "Family Home",
  group_home: "Group Home",
  supported_living: "Supported Living",
  independent_living: "Independent Living",
  facility: "Facility",
};
