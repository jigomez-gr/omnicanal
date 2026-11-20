"use server";
import { revalidatePath } from "next/cache";
import { connectZadarmaChannel } from "@/data/zadarma";
import { ok, type ActionResult } from "@/lib/action-result";
import { PERMISSIONS } from "@/lib/permissions";
import { toActionFailure } from "@/server/errors";
import { requirePermission } from "@/server/session";

export async function connectZadarmaAction(input: unknown): Promise<ActionResult<{ id: string; name: string; webhookUrl: string }>> {
  try {
    const actor = await requirePermission(PERMISSIONS.channels.manage);
    const result = await connectZadarmaChannel(actor, input);
    revalidatePath("/canales", "layout");
    revalidatePath("/agentes", "layout");
    return ok(result);
  } catch (error) {
    return toActionFailure(error);
  }
}
