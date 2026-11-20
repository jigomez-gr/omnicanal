"use server";
import { revalidatePath } from "next/cache";
import { connectVapiChannel } from "@/data/vapi";
import { ok, type ActionResult } from "@/lib/action-result";
import { PERMISSIONS } from "@/lib/permissions";
import { toActionFailure } from "@/server/errors";
import { requirePermission } from "@/server/session";

export async function connectVapiAction(input: unknown): Promise<ActionResult<{ id: string; name: string; webhookUrl: string }>> {
  try {
    const actor = await requirePermission(PERMISSIONS.channels.manage);
    const result = await connectVapiChannel(actor, input);
    revalidatePath("/canales", "layout");
    revalidatePath("/agentes", "layout");
    return ok(result);
  } catch (error) {
    return toActionFailure(error);
  }
}
