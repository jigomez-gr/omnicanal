"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChannelDetail } from "@/data/channels";
import type { Actor } from "@/lib/permissions";
import { simulateZadarmaSmsAction } from "./actions";
import { zadarmaWebhookUrl } from "@/server/channels/zadarma/config";

type ZadarmaPanelProps = {
  actor: Actor;
  channel: ChannelDetail;
  canManage: boolean;
  timezone: string;
};

export function ZadarmaPanel({ channel, canManage }: ZadarmaPanelProps) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const webhookUrl = zadarmaWebhookUrl();
  const config = (channel.config ?? {}) as Record<string, unknown>;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await simulateZadarmaSmsAction(channel.id);
      if (res.ok) {
        setMessage("¡Mensaje SMS simulado creado! Ya puedes verlo en tu bandeja de conversaciones.");
      } else {
        setMessage(res.error || "Error al simular el SMS");
      }
    });
  };

  return (
    <div className="grid gap-6">
      <section aria-labelledby="zadarma-config-title" className="grid gap-4 rounded-xl border p-4 bg-card">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Smartphone className="size-4.5" />
          </div>
          <div>
            <h2 id="zadarma-config-title" className="text-base font-semibold">
              Pasarela SMS (Zadarma)
            </h2>
            <p className="text-xs text-muted-foreground">
              Configuración para envío y recepción de mensajes de texto en el CRM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border p-3 space-y-1">
            <span className="font-semibold text-muted-foreground">Sender ID (Remitente):</span>
            <p className="font-mono text-sm">{String(config.senderId || "Teamsale")}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <span className="font-semibold text-muted-foreground">Confirmación automática:</span>
            <p className="text-sm">{config.autoConfirmation !== false ? "Activada" : "Desactivada"}</p>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-950">URL del Webhook (Zadarma SMS Notifications):</span>
            <Button type="button" variant="outline" size="sm" onClick={copyWebhook} className="h-7 text-xs gap-1.5">
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "Copiada" : "Copiar"}
            </Button>
          </div>
          <code className="block rounded bg-white p-2 text-xs font-mono text-emerald-900 border border-emerald-100 break-all select-all">
            {webhookUrl}
          </code>
          <p className="text-[11px] text-emerald-700">
            Pega esta URL en tu cuenta de Zadarma para recibir los SMS entrantes de tus clientes.
          </p>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSimulate}
              disabled={pending}
              className="gap-2 text-xs"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              {pending ? "Generando SMS..." : "Generar SMS de prueba en la bandeja"}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <a href="https://my.zadarma.com" target="_blank" rel="noopener">
                <ExternalLink className="size-3.5" />
                Abrir Panel de Zadarma
              </a>
            </Button>
          </div>
        ) : null}

        {message ? (
          <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
