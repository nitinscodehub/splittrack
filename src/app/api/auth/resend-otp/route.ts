import { prisma } from "@/lib/prisma";
import {
  assertSameOrigin,
  enforceRateLimit,
  getClientIp,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { issueOtp } from "@/lib/otp";
import { resendOtpSchema } from "@/lib/validators";
import { sendOtpEmail } from "@/lib/notify";
import { isDevOtpEnabled, shouldSkipSmtp } from "@/lib/dev";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const ip = getClientIp(request);
    enforceRateLimit(`resend:ip:${ip}`, 10, 15 * 60 * 1000);

    const input = await parseJson(request, resendOtpSchema);
    const purpose = input.purpose ?? "SIGNUP";
    enforceRateLimit(`resend:${purpose}:${input.email}`, 3, 15 * 60 * 1000);

    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Always return a generic success for password resets to avoid account enumeration.
    if (!user) {
      return jsonOk({ sent: true });
    }
    if (purpose === "SIGNUP" && user.emailVerified) {
      return jsonOk({ sent: true, alreadyVerified: true });
    }

    const latestOtp = await prisma.otpCode.findFirst({
      where: { email: input.email, purpose },
      orderBy: { createdAt: "desc" },
    });

    const code = await issueOtp({
      email: input.email,
      purpose,
      userId: user.id,
      inviteToken: latestOtp?.inviteToken ?? null,
    });
    const devOtp = isDevOtpEnabled() ? code : undefined;
    const sent = shouldSkipSmtp()
      ? false
      : await sendOtpEmail({
          to: user.email,
          name: user.name,
          code,
          purpose,
        });

    return jsonOk({ sent, ...(devOtp ? { devOtp } : {}) });
  });
}

export const dynamic = "force-dynamic";
