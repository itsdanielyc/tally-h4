const PRESENTATION_LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";
const MAX_SAFE_MINOR = BigInt(Number.MAX_SAFE_INTEGER);
const MAX_AMOUNT_TEXT_LENGTH = 64;
const DECIMAL_AMOUNT = /^([+-]?)(\d+)(?:\.(\d+))?$/;
const MINUS_SIGN = "−";

export const currencies = Intl.supportedValuesOf("currency");
const supportedCurrencies = new Set(currencies);
const formatters = new Map<string, Intl.NumberFormat>();
const regionCurrencies: Readonly<Record<string, string>> = {
  AU: "AUD", CA: "CAD", CH: "CHF", CN: "CNY", DE: "EUR", ES: "EUR", FR: "EUR",
  GB: "GBP", IE: "EUR", IN: "INR", IT: "EUR", JP: "JPY", KR: "KRW", NZ: "NZD", US: "USD",
};

/** Returns a currency code supported by this runtime or rejects before any ledger write. */
export function validateCurrency(value: unknown): string {
  if (typeof value !== "string" || !supportedCurrencies.has(value)) {
    throw new Error("Choose a supported ledger currency.");
  }
  return value;
}

/** Uses the operating system's region for the initial currency when it has a known default. */
export function currencyForLocale(locale: string): string {
  try {
    const region = new Intl.Locale(locale).region ?? "";
    return regionCurrencies[region] ?? DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

function formatter(currency: string): Intl.NumberFormat {
  const existing = formatters.get(currency);
  if (existing) return existing;
  const created = new Intl.NumberFormat(PRESENTATION_LOCALE, { style: "currency", currency });
  formatters.set(currency, created);
  return created;
}

/** Returns the minor-unit scale defined for the currency. */
export function currencyDigits(currency: string): number {
  return formatter(currency).resolvedOptions().maximumFractionDigits ?? 0;
}

/** Parses one decimal amount exactly and returns a signed safe integer in minor units. */
export function parseMinorAmount(input: string, currency: string): number {
  const text = input.trim().replace(MINUS_SIGN, "-");
  if (text.length > MAX_AMOUNT_TEXT_LENGTH) throw new Error("This amount is too large.");
  const parts = DECIMAL_AMOUNT.exec(text);
  if (!parts) throw new Error("Enter an amount such as 12 or -24.50.");
  const [, sign, whole, fraction = ""] = parts;
  const digits = currencyDigits(currency);
  if (fraction.length > digits) {
    throw new Error(currency + " supports " + digits + " decimal places.");
  }
  const unsigned = BigInt(whole + fraction.padEnd(digits, "0"));
  if (unsigned > MAX_SAFE_MINOR) throw new Error("This amount is too large.");
  return Number(sign === "-" ? -unsigned : unsigned);
}

/** Formats minor units without passing a fractional amount through floating point. */
export function formatMoney(amountMinor: number | bigint, currency: string): string {
  const amount = BigInt(amountMinor);
  const digits = currencyDigits(currency);
  const unit = 10n ** BigInt(digits);
  const absolute = amount < 0n ? -amount : amount;
  const fraction = (absolute % unit).toString().padStart(digits, "0");
  const parts = formatter(currency).formatToParts(absolute / unit);
  const value = parts.map((part) => part.type === "fraction" ? fraction : part.value).join("");
  return amount < 0n ? MINUS_SIGN + value : value;
}
