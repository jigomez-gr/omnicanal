"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectVapiAction } from "../actions";

export function VapiWizard({ webhookUrl }: { webhookUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("Asistente Telefónico Vapi");
  const [apiKey, setApiKey] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [webhookToken, setWebhookToken] = useState("");

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await connectVapiAction({
        name,
        apiKey,
        assistantId,
        phoneNumberId,
        webhookToken,
      });

      if (!res.ok) {
        setError(res.error || "Error al conectar el canal de Vapi");
        return;
      }

      if (res.data?.id) {
        router.push(`/canales/${res.data.id}`);
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="inline-flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <PhoneCall className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Conectar Asistente Telefónico (Vapi)</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona llamadas entrantes y salientes de voz mediante IA conversacional integrada en tu CRM.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vapi-name">Nombre del canal</Label>
            <Input
              id="vapi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Asistente Telefónico Central"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vapi-key">Clave Privada de Vapi (Private API Key)</Label>
            <Input
              id="vapi-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="vapi_private_..."
              required
            />
            <p className="text-xs text-muted-foreground">
              Obtenida en <code>dashboard.vapi.ai → Org → API Keys</code>. Se guardará cifrada en el servidor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vapi-assistant">ID del Asistente (Assistant ID)</Label>
              <Input
                id="vapi-assistant"
                value={assistantId}
                onChange={(e) => setAssistantId(e.target.value)}
                placeholder="UUID de tu asistente en Vapi"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vapi-phone">ID del Número de Teléfono (Phone ID)</Label>
              <Input
                id="vapi-phone"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="ID de teléfono en Vapi (opcional)"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vapi-token">Token Secreto de Webhook (opcional)</Label>
            <Input
              id="vapi-token"
              type="password"
              value={webhookToken}
              onChange={(e) => setWebhookToken(e.target.value)}
              placeholder="Token para validar peticiones de Vapi"
            />
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-950">URL del Webhook (Server URL para Vapi):</span>
              <Button type="button" variant="outline" size="sm" onClick={copyWebhook} className="h-7 text-xs gap-1.5">
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
            <code className="block rounded bg-white p-2 text-xs font-mono text-blue-900 border border-blue-100 break-all select-all">
              {webhookUrl}
            </code>
            <p className="text-[11px] text-blue-700">
              Pega esta dirección en la sección <b>Server URL</b> de tu Asistente en Vapi para que las llamadas y transcripciones se guarden automáticamente en tus Conversaciones.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Conectar Vapi"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
