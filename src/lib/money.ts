export const PAISE_PER_RUPEE = 100;

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const plainFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format integer paise as ₹1,234.50 */
export function formatINR(paise: number): string {
  return inrFormatter.format(paise / PAISE_PER_RUPEE);
}

/** Format integer paise compactly: ₹1.2K, ₹1.5L */
export function formatINRCompact(paise: number): string {
  return inrCompactFormatter.format(paise / PAISE_PER_RUPEE);
}

/** Format paise without the currency symbol (for inputs). */
export function formatPaisePlain(paise: number): string {
  return plainFormatter.format(paise / PAISE_PER_RUPEE);
}

/** Convert a decimal rupee string ("123.45") into integer paise without floats. */
export function parseAmountToPaise(raw: string): number | null {
  const value = raw.trim().replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(value)) return null;
  const [rupees = "0", fraction = ""] = value.split(".");
  const paise = `${fraction}00`.slice(0, 2);
  const total = Number(rupees) * PAISE_PER_RUPEE + Number(paise);
  if (!Number.isSafeInteger(total) || total < 0) return null;
  return total;
}

export function paiseToInput(paise: number): string {
  return (paise / PAISE_PER_RUPEE).toFixed(2);
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}
