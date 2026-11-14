import {
  enforceRateLimit,
  jsonOk,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { searchUsers } from "@/lib/services/friends";
import { searchQuerySchema } from "@/lib/validators";

export async function GET(request: Request): Promise<Response> {
  return withApi(async () => {
    const user = await requireApiUser();
    enforceRateLimit(`search:${user.id}`, 60, 60 * 1000);

    const url = new URL(request.url);
    const raw = url.searchParams.get("q") ?? "";
    const parsed = searchQuerySchema.safeParse({ q: raw });
    if (!parsed.success) return jsonOk({ results: [] });

    const results = await searchUsers(user.id, parsed.data.q);
    return jsonOk({ results });
  });
}

export const dynamic = "force-dynamic";
