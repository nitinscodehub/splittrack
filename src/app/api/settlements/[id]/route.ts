import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { respondToSettlement } from "@/lib/services/settlements";
import { settlementActionSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`settlement-respond:${user.id}`, 60, 60 * 60 * 1000);

    const input = await parseJson(request, settlementActionSchema);
    await respondToSettlement(user, params.id, input.action);
    return jsonOk({ updated: true });
  });
}

export const dynamic = "force-dynamic";
