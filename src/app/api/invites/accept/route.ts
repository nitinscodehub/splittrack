import { z } from "zod";
import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { acceptInvite } from "@/lib/services/friends";

const schema = z.object({ token: z.string().trim().min(8).max(128) });

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`invite-accept:${user.id}`, 20, 60 * 60 * 1000);

    const input = await parseJson(request, schema);
    await acceptInvite(user, input.token);
    return jsonOk({ connected: true });
  });
}

export const dynamic = "force-dynamic";
