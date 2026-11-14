import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { createSettlement, getPendingSettlements } from "@/lib/services/settlements";
import { settlementSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`settlement-create:${user.id}`, 30, 60 * 60 * 1000);

    const input = await parseJson(request, settlementSchema);
    const id = await createSettlement(user, input);
    return jsonOk({ id }, 201);
  });
}

export async function GET(): Promise<Response> {
  return withApi(async () => {
    const user = await requireApiUser();
    const settlements = await getPendingSettlements(user.id);
    return jsonOk({ settlements });
  });
}

export const dynamic = "force-dynamic";
