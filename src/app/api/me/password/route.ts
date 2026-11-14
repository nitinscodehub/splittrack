import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validators";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`password:${user.id}`, 5, 30 * 60 * 1000);

    const input = await parseJson(request, changePasswordSchema);
    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, "Current password is incorrect.", "INVALID_PASSWORD");

    if (input.currentPassword === input.newPassword) {
      throw new ApiError(422, "Choose a different password.", "SAME_PASSWORD");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await logAudit({
      entity: "USER",
      entityId: user.id,
      action: "UPDATED",
      actorId: user.id,
      diff: { action: "password-change" },
    });

    return jsonOk({ updated: true });
  });
}

export const dynamic = "force-dynamic";
