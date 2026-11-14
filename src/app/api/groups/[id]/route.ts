import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { deleteGroup, updateGroup } from "@/lib/services/groups";
import { groupUpdateSchema } from "@/lib/validators";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`group-update:${user.id}`, 30, 60 * 60 * 1000);

    const input = await parseJson(request, groupUpdateSchema);
    await updateGroup(user, params.id, input);
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
    enforceRateLimit(`group-delete:${user.id}`, 20, 60 * 60 * 1000);

    await deleteGroup(user, params.id);
    return jsonOk({ deleted: true });
  });
}

export const dynamic = "force-dynamic";
