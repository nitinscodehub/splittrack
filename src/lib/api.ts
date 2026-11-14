import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { rateLimit } from "@/lib/rate-limit";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = "API_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonOk<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function jsonError(
  status: number,
  message: string,
  code = "API_ERROR",
  details?: unknown,
): NextResponse {
  return NextResponse.json({ error: message, code, details }, { status });
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const result = rateLimit(key, limit, windowMs);
  if (!result.success) {
    throw new ApiError(
      429,
      `Too many requests. Try again in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`,
      "RATE_LIMITED",
      { retryAfterSeconds: result.retryAfterSeconds },
    );
  }
}

/** Reject cross-site mutations while allowing server-to-server calls (no Origin). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  try {
    const parsed = new URL(origin);
    if (host && parsed.host !== host) {
      throw new ApiError(403, "Cross-origin request blocked.", "CSRF_REJECTED");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, "Invalid origin.", "CSRF_REJECTED");
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body.", "INVALID_JSON");
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ApiError(
      422,
      result.error.issues[0]?.message ?? "Invalid input.",
      "VALIDATION_ERROR",
      result.error.flatten(),
    );
  }
  return result.data;
}

export async function withApi(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.status, error.message, error.code, error.details);
    }
    if (error instanceof ZodError) {
      return jsonError(422, error.issues[0]?.message ?? "Invalid input.", "VALIDATION_ERROR");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return jsonError(409, "That value is already taken or already exists.", "CONFLICT");
      }
      if (error.code === "P2025") {
        return jsonError(404, "Not found.", "NOT_FOUND");
      }
    }
    console.error("[api] unhandled error", error);
    return jsonError(500, "Something went wrong. Please try again.", "INTERNAL_ERROR");
  }
}
