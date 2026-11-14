import { enforceRateLimit, jsonOk, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { getFriendSuggestions } from "@/lib/services/friends";

export async function GET(): Promise<Response> {
  return withApi(async () => {
    const user = await requireApiUser();
    enforceRateLimit(`friend-suggestions:${user.id}`, 30, 60 * 1000);

    const suggestions = await getFriendSuggestions(user.id);
    return jsonOk({ suggestions });
  });
}

export const dynamic = "force-dynamic";
