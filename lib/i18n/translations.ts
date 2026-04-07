import type { Locale, TranslationDictionary } from "./types";
import en from "./locales/en.json";
import es from "./locales/es.json";

const dictionaries: Record<Locale, TranslationDictionary> = { en, es };

export function getDictionary(locale: Locale): TranslationDictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
