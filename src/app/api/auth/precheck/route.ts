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
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validators";

/**
 * Pre-flight check for the login form. It tells the UI whether the credentials
 * are valid but the email is unverified, so it can redirect to the OTP screen.
 * It does not create a session — NextAuth does that after this check passes.
 */
export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const ip = getClientIp(request);
    enforceRateLimit(`precheck:ip:${ip}`, 40, 15 * 60 * 1000);

    const input = await parseJson(request, loginSchema);
    enforceRateLimit(`precheck:email:${input.email}`, 10, 15 * 60 * 1000);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new ApiError(401, "Incorrect email or password.", "INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Incorrect email or password.", "INVALID_CREDENTIALS");
    }

    return jsonOk({
      verified: Boolean(user.emailVerified),
      email: user.email,
      userId: user.userId,
    });
  });
}

export const dynamic = "force-dynamic";
