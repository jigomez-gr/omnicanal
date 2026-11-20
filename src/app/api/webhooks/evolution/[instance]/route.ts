// The webhook receiver for Evolution API v2.3.7.
// Receives events from instance: messages.upsert, messages.update, connection.update.
// Never calls the AI in this handler; answers immediately and delegates processing to the background queue.
import { getRateLimiter } from "@/server/adapters/rate-limiter";
import { readBodyWithLimit } from "@/server/channels/webchat/upload";
import { processEvolutionWebhook } from "@/server/channels/evolution/webhook";
import { clientIp } from "@/server/client-ip";
import { kickTick } from "@/server/inbound/ingest";
import { safeErrorMessage } from "@/server/redact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const WEBHOOK_RATE_LIMIT = 1_800;
export const WEBHOOK_REJECTED_LIMIT = 60;
const WEBHOOK_RATE_WINDOW_MS = 60_000;
const EVOLUTION_WEBHOOK_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type Context = { params: Promise<{ instance: string }> };

const plain = (status: number, body = "") =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

const rejectedKey = (ip: string) => `evo-webhook:rejected:ip:${ip}`;

async function overLimit(ip: string): Promise<boolean> {
  const limiter = getRateLimiter();
  if (await limiter.isLimited(rejectedKey(ip), WEBHOOK_REJECTED_LIMIT, WEBHOOK_RATE_WINDOW_MS)) return true;
  const result = await limiter.hit(`evo-webhook:ip:${ip}`, WEBHOOK_RATE_LIMIT, WEBHOOK_RATE_WINDOW_MS);
  return !result.allowed;
}

async function refused(ip: string, status: 400 | 401 | 413): Promise<Response> {
  await getRateLimiter().hit(rejectedKey(ip), WEBHOOK_REJECTED_LIMIT, WEBHOOK_RATE_WINDOW_MS);
  return plain(status);
}

export async function POST(request: Request, context: Context): Promise<Response> {
  const ip = clientIp(request.headers);
  if (await overLimit(ip)) return plain(429);

  const rawBytes = await readBodyWithLimit(request, EVOLUTION_WEBHOOK_MAX_BYTES);
  if (!rawBytes) return refused(ip, 413);

  let payload: Record<string, unknown>;
  try {
    const text = new TextDecoder().decode(rawBytes);
    payload = JSON.parse(text);
  } catch {
    return refused(ip, 400);
  }

  try {
    const { instance } = await context.params;
    const result = await processEvolutionWebhook(instance, payload, request.headers);

    if (result.status === 401) return refused(ip, 401);
    if (result.status !== 200) return plain(result.status);

    if (result.queuedNow) kickTick({ maxDurationSec: maxDuration });
    if (result.replyRunAt) kickTick({ maxDurationSec: maxDuration, runAt: result.replyRunAt });

    return plain(200, "OK");
  } catch (error) {
    console.error(`[evolution-webhook] Error al procesar webhook: ${safeErrorMessage(error)}`);
    return plain(500);
  }
}
