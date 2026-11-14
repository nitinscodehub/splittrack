import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { deleteExpense, updateExpense } from "@/lib/services/expenses";
import { expenseSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`expense-update:${user.id}`, 60, 10 * 60 * 1000);

    const input = await parseJson(request, expenseSchema);
    await updateExpense(user, params.id, input);
    return jsonOk({ updated: true });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`expense-delete:${user.id}`, 40, 10 * 60 * 1000);

    await deleteExpense(user, params.id);
    return jsonOk({ deleted: true });
  });
}

export const dynamic = "force-dynamic";
