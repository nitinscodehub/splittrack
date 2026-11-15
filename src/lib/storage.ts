import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Neon Object Storage is S3-compatible. Credentials and endpoint are injected
 * into the branch environment as standard AWS_* variables.
 */
export const AVATAR_BUCKET = "uploads";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim();
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Profile photo storage is not configured. Add the AWS_* variables from Neon Object Storage.",
    );
  }

  s3Client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return s3Client;
}

export function avatarObjectKey(userId: string, version: string): string {
  return `avatars/${userId}/${version}.jpg`;
}

export function avatarUrlFor(userId: string, version: string): string {
  return `/api/avatars/${encodeURIComponent(userId)}?v=${encodeURIComponent(version)}`;
}

export function parseAvatarUrl(
  avatarUrl: string | null | undefined,
): { userId: string; version: string } | null {
  if (!avatarUrl) return null;

  try {
    const url = new URL(avatarUrl, "http://localhost");
    const match = /^\/api\/avatars\/([A-Za-z0-9_-]{1,64})$/.exec(url.pathname);
    const userId = match?.[1];
    const version = url.searchParams.get("v") ?? "";
    if (!userId || !/^[a-f0-9]{16,64}$/.test(version)) return null;
    return { userId, version };
  } catch {
    return null;
  }
}

export async function putAvatarObject(key: string, body: Buffer): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: AVATAR_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function getAvatarObject(key: string): Promise<{
  body: Uint8Array;
  contentType: string;
  etag?: string;
} | null> {
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: AVATAR_BUCKET,
        Key: key,
      }),
    );

    if (!response.Body) return null;
    const body = await response.Body.transformToByteArray();
    return {
      body,
      contentType: response.ContentType ?? "image/jpeg",
      etag: response.ETag,
    };
  } catch (error) {
    const known = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (known.name === "NoSuchKey" || known.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

export async function deleteAvatarObject(key: string): Promise<void> {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: AVATAR_BUCKET,
        Key: key,
      }),
    );
  } catch (error) {
    const known = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (known.name === "NoSuchKey" || known.$metadata?.httpStatusCode === 404) return;
    console.error("[storage] Could not delete avatar object", error);
  }
}

export async function deleteManagedAvatar(avatarUrl: string | null | undefined): Promise<void> {
  const parsed = parseAvatarUrl(avatarUrl);
  if (!parsed) return;
  await deleteAvatarObject(avatarObjectKey(parsed.userId, parsed.version));
}
