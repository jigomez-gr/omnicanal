"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectZadarmaAction } from "../actions";

export function ZadarmaWizard({ webhookUrl }: { webhookUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("Zadarma SMS");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [senderId, setSenderId] = useState("Teamsale");

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await connectZadarmaAction({
        name,
        apiKey,
        apiSecret,
        senderId,
      });

      if (!res.ok) {
        setError(res.error || "Error al conectar el canal de Zadarma");
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
          <div className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Conectar Pasarela SMS (Zadarma)</h2>
            <p className="text-sm text-muted-foreground">
              Envía y recibe mensajes de texto SMS con confirmaciones de reservas y avisos automáticos.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="zadarma-name">Nombre del canal</Label>
            <Input
              id="zadarma-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mensajería SMS Zadarma"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zadarma-key">Zadarma API Key</Label>
            <Input
              id="zadarma-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Clave API de usuario en Zadarma"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zadarma-secret">Zadarma API Secret</Label>
            <Input
              id="zadarma-secret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Clave secreta API de Zadarma"
              required
            />
            <p className="text-xs text-muted-foreground">
              Obtenidas en tu panel de Zadarma (<code>Ajustes → Claves de API</code>). Se guardan cifradas.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zadarma-sender">Sender ID (Remitente)</Label>
            <Input
              id="zadarma-sender"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              placeholder="Teamsale o el nombre aprobado en Zadarma"
            />
            <p className="text-xs text-muted-foreground">
              Identificador que verá el cliente al recibir el SMS (ej. <code>Teamsale</code> o tu marca).
            </p>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-950">URL del Webhook para Zadarma:</span>
              <Button type="button" variant="outline" size="sm" onClick={copyWebhook} className="h-7 text-xs gap-1.5">
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
            <code className="block rounded bg-white p-2 text-xs font-mono text-emerald-900 border border-emerald-100 break-all select-all">
              {webhookUrl}
            </code>
            <p className="text-[11px] text-emerald-700">
              Pega esta URL en tu panel de Zadarma para recibir las respuestas entrantes por SMS de tus clientes directamente en tu bandeja.
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
              {pending ? "Guardando..." : "Conectar Zadarma"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
