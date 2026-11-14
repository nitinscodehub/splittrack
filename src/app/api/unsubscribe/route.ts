import {
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/subscription";
import { z } from "zod";

const schema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const input = await parseJson(request, schema);
    enforceRateLimit(`unsubscribe:${input.uid}`, 10, 60 * 60 * 1000);

    if (!verifyUnsubscribeToken(input.uid, input.token)) {
      return jsonOk({ unsubscribed: false }, 400);
    }

    await prisma.user.update({
      where: { id: input.uid },
      data: { remindersOptOut: true },
    });

    return jsonOk({ unsubscribed: true });
  });
}

export const dynamic = "force-dynamic";
