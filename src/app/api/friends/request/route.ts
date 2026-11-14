import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { sendFriendRequest } from "@/lib/services/friends";
import { friendRequestSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`friend-request:${user.id}`, 20, 60 * 60 * 1000);

    const input = await parseJson(request, friendRequestSchema);
    const result = await sendFriendRequest(user, input.userId);
    return jsonOk(result);
  });
}

export const dynamic = "force-dynamic";
