import { cache } from "react";
import { getServerSession } from "next-auth";
import type { User } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
});

/** Use inside API route handlers. Throws a 401 ApiError caught by withApi. */
export async function requireApiUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "You must be signed in.", "UNAUTHORIZED");
  if (!user.emailVerified) {
    throw new ApiError(403, "Verify your email to continue.", "EMAIL_NOT_VERIFIED");
  }
  return user;
}

export function toPublicUser(user: {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
}): { id: string; userId: string; name: string; avatarUrl: string | null } {
  return { id: user.id, userId: user.userId, name: user.name, avatarUrl: user.avatarUrl };
}
