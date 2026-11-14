import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { createGroup } from "@/lib/services/groups";
import { groupSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`group-create:${user.id}`, 15, 60 * 60 * 1000);

    const input = await parseJson(request, groupSchema);
    const id = await createGroup(user, input);
    return jsonOk({ id }, 201);
  });
}

export const dynamic = "force-dynamic";
