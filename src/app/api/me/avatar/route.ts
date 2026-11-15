import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { decodeAvatarDataUrl } from "@/lib/avatar";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";
import {
  avatarObjectKey,
  avatarUrlFor,
  deleteAvatarObject,
  deleteManagedAvatar,
  putAvatarObject,
} from "@/lib/storage";
import { randomToken } from "@/lib/utils";
import { avatarUploadSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`avatar-upload:${user.id}`, 10, 60 * 60 * 1000);

    const input = await parseJson(request, avatarUploadSchema);
    const image = decodeAvatarDataUrl(input.image);
    const version = randomToken(12);
    const key = avatarObjectKey(user.id, version);

    try {
      await putAvatarObject(key, image);
    } catch (error) {
      console.error("[avatar] upload failed", error);
      throw new ApiError(
        503,
        "Photo upload is not available right now. Try again in a minute.",
        "STORAGE_UNAVAILABLE",
      );
    }

    const avatarUrl = avatarUrlFor(user.id, version);
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      });
    } catch (error) {
      await deleteAvatarObject(key);
      throw error;
    }

    await logAudit({
      entity: "USER",
      entityId: user.id,
      action: "UPDATED",
      actorId: user.id,
      diff: { action: "avatar-updated" },
    });

    await deleteManagedAvatar(user.avatarUrl);
    return jsonOk({ avatarUrl });
  });
}

export async function DELETE(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`avatar-delete:${user.id}`, 10, 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    await logAudit({
      entity: "USER",
      entityId: user.id,
      action: "UPDATED",
      actorId: user.id,
      diff: { action: "avatar-removed" },
    });

    await deleteManagedAvatar(user.avatarUrl);
    return jsonOk({ avatarUrl: null });
  });
}

export const dynamic = "force-dynamic";
