import { avatarObjectKey, getAvatarObject } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } },
): Promise<Response> {
  const userId = params.userId;
  const version = new URL(request.url).searchParams.get("v") ?? "";

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId) || !/^[a-f0-9]{16,64}$/.test(version)) {
    return new Response(null, { status: 404 });
  }

  try {
    const object = await getAvatarObject(avatarObjectKey(userId, version));
    if (!object) return new Response(null, { status: 404 });

    return new Response(object.body as BodyInit, {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Content-Type-Options": "nosniff",
        ...(object.etag ? { ETag: object.etag } : {}),
      },
    });
  } catch (error) {
    console.error("[avatar] could not read photo", error);
    return new Response(null, { status: 404 });
  }
}

export const dynamic = "force-dynamic";
