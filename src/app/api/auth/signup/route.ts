import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  getClientIp,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { issueOtp } from "@/lib/otp";
import { signupSchema } from "@/lib/validators";
import { sendOtpEmail } from "@/lib/notify";
import { isDevOtpEnabled, shouldSkipSmtp } from "@/lib/dev";
import { slugifyName } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

async function generatePublicUserId(name: string): Promise<string> {
  const base = slugifyName(name).slice(0, 16) || "user";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = `${base}_${randomInt(1000, 10000)}`;
    const existing = await prisma.user.findUnique({ where: { userId: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  const fallback = `${base}_${randomInt(100000, 1000000)}`;
  const exists = await prisma.user.findUnique({ where: { userId: fallback }, select: { id: true } });
  if (exists) throw new ApiError(500, "Could not create your public ID. Try again.", "ID_ALLOCATION_FAILED");
  return fallback;
}

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const ip = getClientIp(request);
    enforceRateLimit(`signup:ip:${ip}`, 10, 60 * 60 * 1000);

    const input = await parseJson(request, signupSchema);
    enforceRateLimit(`signup:email:${input.email}`, 4, 60 * 60 * 1000);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });

    if (existing?.emailVerified) {
      throw new ApiError(409, "This email is already registered. Sign in instead.", "EMAIL_EXISTS");
    }

    if (existing) {
      const latestOtp = await prisma.otpCode.findFirst({
        where: { email: input.email, purpose: "SIGNUP" },
        orderBy: { createdAt: "desc" },
      });
      const code = await issueOtp({
        email: input.email,
        purpose: "SIGNUP",
        userId: existing.id,
        inviteToken: input.inviteToken ?? latestOtp?.inviteToken ?? null,
      });
      const devOtp = isDevOtpEnabled() ? code : undefined;
      const sent = shouldSkipSmtp()
        ? false
        : await sendOtpEmail({
            to: input.email,
            name: existing.name,
            code,
            purpose: "SIGNUP",
          });
      return jsonOk(
        {
          requiresVerification: true,
          email: input.email,
          emailSent: sent,
          ...(devOtp ? { devOtp } : {}),
        },
        200,
      );
    }

    const publicUserId = await generatePublicUserId(input.name);
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        userId: publicUserId,
        passwordHash,
        emailVerified: null,
      },
    });

    const code = await issueOtp({
      email: input.email,
      purpose: "SIGNUP",
      userId: user.id,
      inviteToken: input.inviteToken ?? null,
    });

    await logAudit({
      entity: "USER",
      entityId: user.id,
      action: "CREATED",
      actorId: user.id,
      diff: { name: user.name, userId: user.userId, email: user.email },
    });

    const devOtp = isDevOtpEnabled() ? code : undefined;
    const sent = shouldSkipSmtp()
      ? false
      : await sendOtpEmail({
          to: user.email,
          name: user.name,
          code,
          purpose: "SIGNUP",
        });

    return jsonOk(
      {
        requiresVerification: true,
        email: user.email,
        userId: user.userId,
        emailSent: sent,
        ...(devOtp ? { devOtp } : {}),
      },
      201,
    );
  });
}

export const dynamic = "force-dynamic";
