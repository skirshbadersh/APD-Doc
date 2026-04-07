import { isWeekend, previousFriday, nextMonday, isAfter, isBefore, isEqual } from "date-fns";

/**
 * Snap a date to the nearest weekday.
 * Saturday → Friday. Sunday → Monday. Otherwise return as-is.
 */
export function snapToWeekday(date: Date): Date {
  if (!isWeekend(date)) return date;
  const day = date.getDay();
  if (day === 6) return previousFriday(date);
  return nextMonday(date);
}

/**
 * Check if a date falls on a weekday (Monday–Friday).
 */
export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

/**
 * Returns the next weekday on or after the given date.
 */
export function getNextWeekday(date: Date): Date {
  if (!isWeekend(date)) return date;
  return nextMonday(date);
}
