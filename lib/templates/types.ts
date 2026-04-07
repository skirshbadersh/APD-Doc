import type {
  Client,
  Contact,
  Service,
  Goal,
  Medication,
  ClientSpecialConsideration,
  ClientEvent,
  Profile,
  ContactType,
  NoteCategory,
  SpecialConsideration,
} from "@/lib/types/database";

export interface TemplateContext {
  client: Client;
  contacts: Contact[];
  services: Service[];
  goals: Goal[];
  medications: Medication[];
  considerations: ClientSpecialConsideration[];
  events: ClientEvent[];
  profile: Profile;
  noteDate: Date;
  contactType: ContactType;
  noteCategory: NoteCategory;
  isHomeVisit: boolean;
  contactWith: string;
  spYear: string;
  /** 1-12, which month within the SP year (1 = SP effective month) */
  monthInSpYear: number;
  /** 1 or 2 — which contact slot in the calendar this note fills */
  contactSlot: 1 | 2;
}

export type TemplateFunction = (ctx: TemplateContext) => string;
