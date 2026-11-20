"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, PhoneCall, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChannelDetail } from "@/data/channels";
import type { Actor } from "@/lib/permissions";
import { simulateVapiCallAction } from "./actions";
import { vapiWebhookUrl } from "@/server/channels/vapi/config";

type VapiPanelProps = {
  actor: Actor;
  channel: ChannelDetail;
  canManage: boolean;
  timezone: string;
};

export function VapiPanel({ channel, canManage }: VapiPanelProps) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const webhookUrl = vapiWebhookUrl();
  const config = (channel.config ?? {}) as Record<string, unknown>;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await simulateVapiCallAction(channel.id);
      if (res.ok) {
        setMessage("¡Llamada simulada creada! Ya puedes verla en tu bandeja de conversaciones.");
      } else {
        setMessage(res.error || "Error al simular la llamada");
      }
    });
  };

  return (
    <div className="grid gap-6">
      <section aria-labelledby="vapi-config-title" className="grid gap-4 rounded-xl border p-4 bg-card">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <PhoneCall className="size-4.5" />
          </div>
          <div>
            <h2 id="vapi-config-title" className="text-base font-semibold">
              Integración de Telefonía e IA (Vapi)
            </h2>
            <p className="text-xs text-muted-foreground">
              Configuración del asistente de voz de Vapi conectado a tu CRM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border p-3 space-y-1">
            <span className="font-semibold text-muted-foreground">ID del Asistente:</span>
            <p className="font-mono text-sm">{String(config.assistantId || "No configurado")}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <span className="font-semibold text-muted-foreground">Número / Phone ID:</span>
            <p className="font-mono text-sm">{String(config.phoneNumberId || config.phoneNumber || "No configurado")}</p>
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-950">URL del Webhook (Server URL en Vapi):</span>
            <Button type="button" variant="outline" size="sm" onClick={copyWebhook} className="h-7 text-xs gap-1.5">
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              {copied ? "Copiada" : "Copiar"}
            </Button>
          </div>
          <code className="block rounded bg-white p-2 text-xs font-mono text-blue-900 border border-blue-100 break-all select-all">
            {webhookUrl}
          </code>
          <p className="text-[11px] text-blue-700">
            Copia esta URL y configúrala como <b>Server URL</b> en Vapi para que las llamadas se registren automáticamente.
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
              {pending ? "Generando llamada..." : "Generar llamada de prueba en la bandeja"}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener">
                <ExternalLink className="size-3.5" />
                Abrir Dashboard de Vapi
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
