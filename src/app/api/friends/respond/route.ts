import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { respondToFriendRequest } from "@/lib/services/friends";
import { friendRespondSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`friend-respond:${user.id}`, 40, 60 * 60 * 1000);

    const input = await parseJson(request, friendRespondSchema);
    await respondToFriendRequest(user, input.friendshipId, input.action);
    return jsonOk({ ok: true });
  });
}

export const dynamic = "force-dynamic";
