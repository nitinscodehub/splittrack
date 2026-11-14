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
import { verifyOtpCode } from "@/lib/otp";
import { verifyOtpSchema } from "@/lib/validators";
import { connectPendingEmailInvites, connectViaInviteToken } from "@/lib/services/friends";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const ip = getClientIp(request);
    enforceRateLimit(`verify:ip:${ip}`, 20, 15 * 60 * 1000);

    const input = await parseJson(request, verifyOtpSchema);
    enforceRateLimit(`verify:email:${input.email}`, 10, 15 * 60 * 1000);

    const { inviteToken } = await verifyOtpCode({
      email: input.email,
      purpose: "SIGNUP",
      code: input.code,
    });

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new ApiError(404, "Account not found. Sign up again.", "USER_NOT_FOUND");

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    if (inviteToken) await connectViaInviteToken(inviteToken, user.id);
    await connectPendingEmailInvites(user);

    return jsonOk({ verified: true, email: user.email });
  });
}

export const dynamic = "force-dynamic";
