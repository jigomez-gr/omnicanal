"use server";
import { revalidatePath } from "next/cache";
import { simulateVapiCall } from "@/data/vapi";
import { ok, type ActionResult } from "@/lib/action-result";
import { PERMISSIONS } from "@/lib/permissions";
import { toActionFailure } from "@/server/errors";
import { requirePermission } from "@/server/session";

export async function simulateVapiCallAction(channelId: string): Promise<ActionResult<{ conversationId: string; success: boolean }>> {
  try {
    const actor = await requirePermission(PERMISSIONS.channels.manage);
    const result = await simulateVapiCall(actor, channelId);
    revalidatePath("/bandeja", "layout");
    return ok(result);
  } catch (error) {
    return toActionFailure(error);
  }
}
