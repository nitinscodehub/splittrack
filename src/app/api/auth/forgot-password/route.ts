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
import { forgotPasswordSchema } from "@/lib/validators";
import { sendOtpEmail } from "@/lib/notify";
import { isDevOtpEnabled, shouldSkipSmtp } from "@/lib/dev";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const ip = getClientIp(request);
    enforceRateLimit(`forgot:ip:${ip}`, 6, 60 * 60 * 1000);

    const input = await parseJson(request, forgotPasswordSchema);
    enforceRateLimit(`forgot:email:${input.email}`, 3, 60 * 60 * 1000);

    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Always return the same response to prevent account enumeration.
    let devOtp: string | undefined;
    if (user) {
      const code = await issueOtp({
        email: user.email,
        purpose: "RESET",
        userId: user.id,
      });
      devOtp = isDevOtpEnabled() ? code : undefined;
      if (!shouldSkipSmtp()) {
        await sendOtpEmail({
          to: user.email,
          name: user.name,
          code,
          purpose: "RESET",
        });
      }
    }

    return jsonOk({ sent: true, ...(devOtp ? { devOtp } : {}) });
  });
}

export const dynamic = "force-dynamic";
