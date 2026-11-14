import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { createExpense } from "@/lib/services/expenses";
import { getActivityFeed } from "@/lib/services/activity";
import { expenseSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`expense-create:${user.id}`, 60, 10 * 60 * 1000);

    const input = await parseJson(request, expenseSchema);
    const id = await createExpense(user, input);
    return jsonOk({ id }, 201);
  });
}

export async function GET(): Promise<Response> {
  return withApi(async () => {
    const user = await requireApiUser();
    const feed = await getActivityFeed(user.id);
    return jsonOk(feed);
  });
}

export const dynamic = "force-dynamic";
