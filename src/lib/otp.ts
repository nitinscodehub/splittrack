import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { OtpPurpose } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function otpSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to hash OTP codes.");
  return secret;
}

function hashCode(email: string, purpose: OtpPurpose, code: string): string {
  return createHmac("sha256", otpSecret()).update(`${purpose}:${email}:${code}`).digest("hex");
}

function hashEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export interface IssueOtpInput {
  email: string;
  purpose: OtpPurpose;
  userId?: string | null;
  inviteToken?: string | null;
}

export async function issueOtp(input: IssueOtpInput): Promise<string> {
  const recent = await prisma.otpCode.findFirst({
    where: { email: input.email, purpose: input.purpose },
    orderBy: { createdAt: "desc" },
  });

  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new ApiError(429, "Please wait 60 seconds before requesting a new code.", "OTP_COOLDOWN");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

  await prisma.otpCode.create({
    data: {
      email: input.email,
      userId: input.userId ?? null,
      purpose: input.purpose,
      codeHash: hashCode(input.email, input.purpose, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      inviteToken: input.inviteToken ?? null,
    },
  });

  // Opportunistic cleanup of long-expired codes.
  await prisma.otpCode.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  return code;
}

export interface VerifyOtpInput {
  email: string;
  purpose: OtpPurpose;
  code: string;
}

export async function verifyOtpCode(input: VerifyOtpInput): Promise<{ inviteToken: string | null }> {
  const otp = await prisma.otpCode.findFirst({
    where: { email: input.email, purpose: input.purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw new ApiError(400, "No active code found. Request a new one.", "OTP_NOT_FOUND");
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "This code has expired. Request a new one.", "OTP_EXPIRED");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many incorrect attempts. Request a new code.", "OTP_LOCKED");
  }

  const expected = hashCode(input.email, input.purpose, input.code);
  const actual = otp.codeHash;
  if (!hashEquals(actual, expected)) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    throw new ApiError(
      400,
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
        : "Incorrect code. Request a new one.",
      "OTP_INVALID",
    );
  }

  const consumed = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) {
    throw new ApiError(400, "This code was already used. Request a new one.", "OTP_USED");
  }

  return { inviteToken: otp.inviteToken };
}
