import { createHmac, timingSafeEqual } from "node:crypto";
import { absoluteUrl } from "@/lib/utils";

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is required to sign unsubscribe links.");
  return value;
}

export function createUnsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = createUnsubscribeToken(userId);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function unsubscribeUrl(userId: string): string {
  return absoluteUrl(`/unsubscribe?uid=${encodeURIComponent(userId)}&token=${createUnsubscribeToken(userId)}`);
}
