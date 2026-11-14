import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { createInvite } from "@/lib/services/friends";
import { inviteSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`invite:${user.id}`, 20, 60 * 60 * 1000);

    const input = await parseJson(request, inviteSchema);
    const invite = await createInvite(user, input.email);
    return jsonOk(invite, 201);
  });
}

export const dynamic = "force-dynamic";
