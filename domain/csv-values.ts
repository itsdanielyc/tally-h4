import type { DateOrder } from "../contracts/import";
import { currencyDigits, parseMinorAmount } from "./money";
import { isCalendarDate } from "./transactions";

const DATE_PARTS = /^(\d{1,4})([./-])(\d{1,2})\2(\d{1,4})$/;
const RECENT_YEAR_PIVOT = 70;
const THOUSANDS_DIGITS = 3;
const THOUSANDS_GROUPS = /^\d{1,3}([,. ])\d{3}(?:\1\d{3})*$/;
const WHOLE_DIGITS = /^\d+$/;

/** Normalizes a bank's date to a calendar day using the explicitly selected order. */
export function parseCsvDate(raw: string, order: DateOrder): string {
  const text = raw.trim();
  if (isCalendarDate(text)) return text;
  const match = DATE_PARTS.exec(text);
  if (!match) throw new Error("Enter a valid calendar date.");
  const [, first, , second, third] = match;
  const positions = order === "YMD" || first.length === 4 ? [first, second, third]
    : order === "DMY" ? [third, second, first] : [third, first, second];
  const [year, month, day] = positions;
  const century = Number(year) >= RECENT_YEAR_PIVOT ? "19" : "20";
  const normalized = [year.length === 2 ? century + year : year, month.padStart(2, "0"), day.padStart(2, "0")].join("-");
  if (!isCalendarDate(normalized)) throw new Error("Enter a valid calendar date.");
  return normalized;
}

function decimalOffset(value: string, currency: string): number {
  const comma = value.lastIndexOf(",");
  const period = value.lastIndexOf(".");
  if (comma >= 0 && period >= 0) return Math.max(comma, period);
  const last = Math.max(comma, period);
  if (last < 0) return -1;
  const mark = value.charAt(last);
  if (value.indexOf(mark) !== last) return -1;
  const remaining = value.length - last - 1;
  return remaining === THOUSANDS_DIGITS && currencyDigits(currency) !== THOUSANDS_DIGITS ? -1 : last;
}

/** Interprets signed decimal or decimal-comma amounts and validates grouping before conversion. */
export function parseCsvAmount(raw: string, currency: string): number {
  const text = raw.trim().replace(/[\u00a0\u202f]/g, " ").replace("−", "-");
  const wrapped = text.startsWith("(") && text.endsWith(")");
  const negative = wrapped || text.startsWith("-");
  const unsigned = wrapped ? text.slice(1, -1).trim() : text.replace(/^[+-]/, "");
  const decimal = decimalOffset(unsigned, currency);
  const integral = decimal >= 0 ? unsigned.slice(0, decimal) : unsigned;
  const fraction = decimal >= 0 ? "." + unsigned.slice(decimal + 1) : "";
  if (!WHOLE_DIGITS.test(integral) && !THOUSANDS_GROUPS.test(integral)) {
    throw new Error("Enter a valid amount with consistent digit grouping.");
  }
  return parseMinorAmount((negative ? "-" : "") + integral.replace(/[,. ]/g, "") + fraction, currency);
}
