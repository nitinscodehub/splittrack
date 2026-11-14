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
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validators";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const ip = getClientIp(request);
    enforceRateLimit(`reset:ip:${ip}`, 15, 30 * 60 * 1000);

    const input = await parseJson(request, resetPasswordSchema);
    enforceRateLimit(`reset:email:${input.email}`, 8, 30 * 60 * 1000);

    await verifyOtpCode({ email: input.email, purpose: "RESET", code: input.code });

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new ApiError(404, "Account not found.", "USER_NOT_FOUND");

    const passwordHash = await hashPassword(input.password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await logAudit({
      entity: "USER",
      entityId: user.id,
      action: "UPDATED",
      actorId: user.id,
      diff: { action: "password-reset" },
    });

    return jsonOk({ reset: true });
  });
}

export const dynamic = "force-dynamic";
