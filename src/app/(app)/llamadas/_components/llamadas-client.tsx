"use client"

import {
  CheckCircle2,
  Copy,
  Headphones,
  MessageSquareText,
  Mic,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Radio,
  Send,
  Settings2,
  Volume2,
} from "lucide-react"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { getVapiAndCallsDashboard } from "@/data/flamenco"
import { VAPI_SPANISH_VOICES } from "@/lib/vapi/client"
import {
  connectZadarmaSipTrunkServerAction,
  saveVapiZadarmaSettingsAction,
  sendZadarmaEchoTestServerAction,
  sendZadarmaSmsServerAction,
  syncFlamencoToolsServerAction,
  triggerOutboundCallServerAction,
} from "../actions"

type DashboardData = Awaited<ReturnType<typeof getVapiAndCallsDashboard>>

export function LlamadasClient({
  data,
  canManage,
  canConfigure,
}: {
  data: DashboardData
  canManage: boolean
  canConfigure: boolean
}) {
  const [activeTab, setActiveTab] = useState<"registro" | "estudio_voz" | "sms_zadarma" | "ajustes_vapi">(
    "registro",
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [selectedCallId, setSelectedCallId] = useState<string | null>(
    data.calls[0]?.id ?? null,
  )

  // Estados llamada saliente
  const [testCallPhone, setTestCallPhone] = useState("+34919933764")
  const [testCallName, setTestCallName] = useState("Programador Tablao / Sala")

  // Estados envío SMS Zadarma directo
  const [smsPhone, setSmsPhone] = useState("+34919933764")
  const [smsText, setSmsText] = useState(
    "soniqueteflamenco.com: Confirmada nuestra reunion de contratacion artistica. Te hemos enviado el dossier y videos a tu correo.",
  )

  // Estados Configuración VAPI & Zadarma (exactamente como en crm_salvadora)
  const [vapiEnabled, setVapiEnabled] = useState(data.config.vapiEnabled)
  const [vapiApiKey, setVapiApiKey] = useState(data.config.maskedVapiApiKey ?? "")
  const [vapiAssistantId, setVapiAssistantId] = useState(data.config.vapiAssistantId)
  const [vapiPhoneNumberId] = useState(data.config.vapiPhoneNumberId)
  const [zadarmaPhoneNumber, setZadarmaPhoneNumber] = useState(data.config.zadarmaPhoneNumber)
  const [zadarmaSipServer] = useState(data.config.zadarmaSipServer)
  const [zadarmaSipLogin] = useState(data.config.zadarmaSipLogin)
  const [voiceProvider] = useState(data.config.voiceProvider)
  const [voiceId, setVoiceId] = useState(data.config.voiceId)
  const [transcriberProvider] = useState(data.config.transcriberProvider)
  const [transcriberModel] = useState(data.config.transcriberModel)
  const [transcriberLanguage] = useState(data.config.transcriberLanguage)
  const [llmModel, setLlmModel] = useState(data.config.llmModel)
  const [temperature] = useState(data.config.temperature)
  const [systemPrompt, setSystemPrompt] = useState(data.config.systemPrompt)
  const [n8nSmsWebhookUrl, setN8nSmsWebhookUrl] = useState(data.config.n8nSmsWebhookUrl)
  const [zadarmaSmsKey, setZadarmaSmsKey] = useState(
    data.config.maskedZadarmaSmsKey ?? "45dc42d6f22439899024",
  )
  const [zadarmaSmsSecret, setZadarmaSmsSecret] = useState(
    data.config.maskedZadarmaSmsSecret ?? "34061190a934a453aa99",
  )
  const [zadarmaSmsCallerId, setZadarmaSmsCallerId] = useState(
    data.config.zadarmaSmsCallerId || "+34919933764",
  )
  const [autoSendBookingSms, setAutoSendBookingSms] = useState(data.config.autoSendBookingSms)
  const [zadarmaSipPassword, setZadarmaSipPassword] = useState("PddEcd72ZQ")

  const selectedCall = data.calls.find((c) => c.id === selectedCallId) ?? data.calls[0]

  return (
    <div className="space-y-6">
      {feedback ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            {feedback}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setFeedback(null)}>
            Cerrar
          </Button>
        </div>
      ) : null}

      {/* Subnavegación */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          variant={activeTab === "registro" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("registro")}
          className="gap-1.5"
        >
          <PhoneCall className="size-4" />
          Registro de Llamadas ({data.calls.length})
        </Button>
        <Button
          variant={activeTab === "estudio_voz" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("estudio_voz")}
          className="gap-1.5"
        >
          <Headphones className="size-4" />
          Estudio de Voz IA (ElevenLabs / Deepgram / SIP Zadarma)
        </Button>
        <Button
          variant={activeTab === "sms_zadarma" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("sms_zadarma")}
          className="gap-1.5"
        >
          <MessageSquareText className="size-4" />
          SMS Zadarma ({data.smsLogs.length})
        </Button>
        <Button
          variant={activeTab === "ajustes_vapi" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("ajustes_vapi")}
          className="gap-1.5"
        >
          <Settings2 className="size-4" />
          Voz Telefónica (VAPI & Zadarma) y SMS (n8n)
        </Button>
      </div>

      {/* TAB 1: REGISTRO DE LLAMADAS + AUDIO + TRANSCRIPCIÓN */}
      {activeTab === "registro" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {canManage && (
              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <h3 className="mb-2 text-sm font-semibold">
                  Lanzar Llamada Saliente con el Agente IA VAPI (vía SIP Trunk Zadarma)
                </h3>
                <form
                  className="grid gap-2 sm:grid-cols-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    startTransition(async () => {
                      const res = await triggerOutboundCallServerAction({
                        phoneNumber: testCallPhone,
                        callerName: testCallName,
                      })
                      setFeedback(res.message)
                    })
                  }}
                >
                  <Input
                    value={testCallName}
                    onChange={(e) => setTestCallName(e.target.value)}
                    placeholder="Nombre del programador o artista"
                  />
                  <Input
                    required
                    value={testCallPhone}
                    onChange={(e) => setTestCallPhone(e.target.value)}
                    placeholder="+34919933764"
                  />
                  <Button type="submit" disabled={isPending}>
                    <PhoneOutgoing className="mr-1.5 size-4" />
                    Llamar ahora
                  </Button>
                </form>
              </div>
            )}

            <div className="grid gap-2 2xl:grid-cols-2">
              {data.calls.map((c) => {
                const isSelected = selectedCall?.id === c.id
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCallId(c.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {c.direction === "inbound" ? (
                          <PhoneIncoming className="size-4 text-emerald-600" />
                        ) : (
                          <PhoneOutgoing className="size-4 text-sky-600" />
                        )}
                        <span className="font-semibold">
                          {c.callerName || "Interlocutor"} ({c.phoneNumber})
                        </span>
                        <Badge variant="outline">
                          {c.direction === "inbound" ? "Entrante" : "Saliente"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{c.durationSeconds} s</span>
                        <span>·</span>
                        <span>{new Date(c.startedAt).toLocaleString("es-ES")}</span>
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {c.summary}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-5">
            {selectedCall ? (
              <div className="sticky top-4 space-y-4 rounded-xl border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold">
                      {selectedCall.callerName} · {selectedCall.phoneNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ID VAPI: {selectedCall.vapiCallId || selectedCall.id.slice(0, 10)} · Duración:{" "}
                      {selectedCall.durationSeconds} segundos
                    </p>
                  </div>
                  <Badge>{selectedCall.status}</Badge>
                </div>

                {selectedCall.recordingUrl ? (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                      <Volume2 className="size-4 text-primary" />
                      Grabación de la llamada
                    </div>
                    <audio
                      controls
                      className="w-full"
                      src={`/api/calls/${selectedCall.id}/recording`}
                    />
                  </div>
                ) : null}

                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Resumen IA de la Conversación
                  </h4>
                  <p className="rounded-lg bg-muted/30 p-3 text-xs">
                    {selectedCall.summary}
                  </p>
                </div>

                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Transcripción Completa
                  </h4>
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 font-sans text-xs">
                    {selectedCall.transcript || "Sin transcripción disponible."}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 2: ESTUDIO DE VOZ IA (ELEVENLABS + DEEPGRAM + SIP ZADARMA) */}
      {activeTab === "estudio_voz" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Mic className="size-4 text-primary" />
              Catálogo de Voces Españolas (ElevenLabs Multilingual v2)
            </h3>
            <div className="space-y-2">
              {VAPI_SPANISH_VOICES.map((v) => {
                const selected = voiceId === v.id
                return (
                  <div
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      selected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{v.name}</span>
                      <div className="flex gap-1.5">
                        <Badge variant="outline">{v.accent}</Badge>
                        {v.recommended ? <Badge>Recomendada</Badge> : null}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{v.style}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <div>
                <Label>Transcriptor STT</Label>
                <Input
                  value={`${transcriberProvider} (${transcriberModel} · ${transcriberLanguage})`}
                  readOnly
                />
              </div>
              <div>
                <Label>Modelo Cerebral LLM</Label>
                <Input
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="font-semibold">
                <Radio className="mr-1 inline size-3.5 text-primary" />
                Conexión SIP Trunk Zadarma → VAPI:
              </div>
              <p className="mt-1 text-muted-foreground">
                Servidor SIP: <code>{zadarmaSipServer}</code> · Extensión SIP:{" "}
                <code>{zadarmaSipLogin}</code> · Línea pública:{" "}
                <strong>{zadarmaPhoneNumber}</strong>
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-5 shadow-xs">
            <h3 className="text-base font-bold">
              Prompt Telefónico de soniqueteflamenco.com (Sincronizado con Catálogo de Intérpretes)
            </h3>
            <Textarea
              rows={15}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="font-mono text-xs"
            />
            {canConfigure && (
              <Button
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await saveVapiZadarmaSettingsAction({
                      vapiEnabled,
                      vapiApiKey,
                      vapiAssistantId,
                      vapiPhoneNumberId,
                      zadarmaPhoneNumber,
                      zadarmaSipServer,
                      zadarmaSipLogin,
                      voiceProvider,
                      voiceId,
                      transcriberProvider,
                      transcriberModel,
                      transcriberLanguage,
                      llmModel,
                      temperature,
                      systemPrompt,
                      n8nSmsWebhookUrl,
                      zadarmaSmsKey,
                      zadarmaSmsSecret,
                      zadarmaSmsCallerId,
                      autoSendBookingSms,
                    })
                    setFeedback("Configuración del Estudio de Voz y Prompt actualizada.")
                  })
                }}
              >
                Guardar Voz y Prompt en VAPI
              </Button>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SMS ZADARMA (CON SANITIZACIÓN ANTI-BLOQUEO ESPAÑA + FIRMA HMAC-SHA1) */}
      {activeTab === "sms_zadarma" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-5">
            <h3 className="mb-1 text-base font-bold">
              Enviar SMS Directo por Zadarma API v1
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Incluye firma criptográfica <code>MD5 + HMAC-SHA1 + Base64 (RFC 3986)</code> y filtro automático para operadoras españolas (elimina URLs y dominios <code>.com</code> que Movistar/Vodafone/Orange bloquean por anti-phishing).
            </p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  const res = await sendZadarmaSmsServerAction({
                    toPhone: smsPhone,
                    message: smsText,
                  })
                  setFeedback(
                    `SMS procesado por Zadarma hacia ${res.log.toPhone} (estado: ${res.log.status}).`,
                  )
                })
              }}
            >
              <div>
                <Label>Teléfono móvil destinatario</Label>
                <Input
                  required
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  placeholder="+34919933764"
                />
              </div>
              <div>
                <Label>Remitente (Sender ID)</Label>
                <Input value={zadarmaSmsCallerId} readOnly />
              </div>
              <div>
                <Label>Mensaje SMS</Label>
                <Textarea
                  rows={4}
                  required
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                <Send className="mr-1.5 size-4" />
                Enviar SMS por Zadarma
              </Button>
            </form>
          </div>

          <div className="space-y-3 lg:col-span-7">
            <h3 className="text-base font-semibold">
              Auditoría de SMS Enviados (`zadarma_sms_respuesta`) ({data.smsLogs.length})
            </h3>
            {data.smsLogs.map((log) => (
              <div key={log.id} className="rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    Para: +{log.toPhone} · Remitente: {log.callerId || "Soniquete"}
                  </div>
                  <div className="flex items-center gap-2">
                    {log.cost ? <Badge variant="outline">{log.cost}</Badge> : null}
                    <Badge variant={log.status.includes("success") ? "default" : "secondary"}>
                      {log.status}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{log.message}</p>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString("es-ES")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PANEL IDÉNTICO AL DE CRM_SALVADORA: "Voz Telefónica (VAPI & Zadarma) y SMS (n8n)" */}
      {activeTab === "ajustes_vapi" && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <PhoneCall className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  Voz Telefónica (VAPI & Zadarma) y SMS (n8n)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configuración del agente telefónico y envío de confirmaciones por SMS
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={vapiEnabled}
                onChange={(e) => setVapiEnabled(e.target.checked)}
              />
              VAPI Activo
            </label>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              startTransition(async () => {
                await saveVapiZadarmaSettingsAction({
                  vapiEnabled,
                  vapiApiKey,
                  vapiAssistantId,
                  vapiPhoneNumberId,
                  zadarmaPhoneNumber,
                  zadarmaSipServer,
                  zadarmaSipLogin,
                  voiceProvider,
                  voiceId,
                  transcriberProvider,
                  transcriberModel,
                  transcriberLanguage,
                  llmModel,
                  temperature,
                  systemPrompt,
                  n8nSmsWebhookUrl,
                  zadarmaSmsKey,
                  zadarmaSmsSecret,
                  zadarmaSmsCallerId,
                  autoSendBookingSms,
                })
                setFeedback(
                  "Credenciales de VAPI, línea Zadarma y pasarela SMS guardadas y cifradas en base de datos.",
                )
              })
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>VAPI API Key (Privada)</Label>
                <Input
                  type="password"
                  value={vapiApiKey}
                  onChange={(e) => setVapiApiKey(e.target.value)}
                  placeholder="••••••••-••••-••••-••••-••••••••••••"
                />
              </div>
              <div>
                <Label>ID del Asistente en VAPI</Label>
                <Input
                  value={vapiAssistantId}
                  onChange={(e) => setVapiAssistantId(e.target.value)}
                  placeholder="asst_..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Número Telefónico Virtual (Zadarma E.164)</Label>
                <Input
                  value={zadarmaPhoneNumber}
                  onChange={(e) => setZadarmaPhoneNumber(e.target.value)}
                  placeholder="+34919933764"
                />
              </div>
              <div>
                <Label>URL Webhook para configurar en VAPI (Server URL)</Label>
                <div className="flex gap-2">
                  <Input value={data.config.webhookUrl} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(data.config.webhookUrl)
                      setFeedback("URL del Webhook de VAPI copiada al portapapeles.")
                    }}
                  >
                    <Copy className="mr-1 size-3.5" />
                    Copiar
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await syncFlamencoToolsServerAction()
                    setFeedback(res.message)
                  })
                }}
              >
                Sincronizar Herramientas en VAPI
              </Button>
            </div>

            {/* SECCIÓN LÍNEA SALIENTE DE ZADARMA (CALLER ID +34) IDÉNTICA A CRM_SALVADORA */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">
                    Línea Saliente de Zadarma (Caller ID +34)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Para que las llamadas salientes no muestren el número internacional (+44) y salgan a través de tu cuenta de Zadarma con tu número {zadarmaPhoneNumber || "+34919933764"}, introduce aquí la contraseña de tu SIP de Zadarma.
                  </p>
                </div>
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
                  Emite con tu número español
                </Badge>
              </div>

              <div className="grid gap-3 pt-2 md:grid-cols-3">
                <div>
                  <Label>Servidor SIP</Label>
                  <Input value={zadarmaSipServer} readOnly />
                </div>
                <div>
                  <Label>Usuario / Login SIP (Zadarma)</Label>
                  <Input value={zadarmaSipLogin || "536586"} readOnly />
                </div>
                <div>
                  <Label>Contraseña SIP</Label>
                  <Input
                    type="password"
                    placeholder="Contraseña de tu SIP"
                    value={zadarmaSipPassword}
                    onChange={(e) => setZadarmaSipPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await sendZadarmaEchoTestServerAction()
                      setFeedback(res.message)
                    })
                  }}
                >
                  Validar IP en Zadarma (Llamada Eco 4444 / 8888)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    if (!zadarmaSipPassword.trim()) {
                      setFeedback("Por favor introduce la contraseña de tu cuenta SIP de Zadarma.")
                      return
                    }
                    startTransition(async () => {
                      const res = await connectZadarmaSipTrunkServerAction({
                        authUsername: zadarmaSipLogin || "536586",
                        authPassword: zadarmaSipPassword.trim(),
                        gateway: zadarmaSipServer,
                      })
                      setFeedback(res.message)
                    })
                  }}
                >
                  Vincular Línea Zadarma con VAPI
                </Button>
              </div>
            </div>

            <div>
              <Label>Endpoint para Llamadas Salientes (Desde tu Landing Page)</Label>
              <div className="mt-1 flex gap-2">
                <Input value={`POST ${data.config.outboundApiUrl}`} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(data.config.outboundApiUrl)
                    setFeedback("Endpoint de llamadas salientes copiado.")
                  }}
                >
                  <Copy className="mr-1 size-3.5" />
                  Copiar
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Envía un JSON con <code>{`{ "phoneNumber": "+34600000000", "name": "Nombre" }`}</code> para que el agente llame inmediatamente al cliente.
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-3 text-sm font-bold">
                Envío de SMS de Confirmación (Vía n8n + Zadarma)
              </h4>
              <div className="space-y-3">
                <div>
                  <Label>URL del Webhook en n8n para envío de SMS</Label>
                  <Input
                    value={n8nSmsWebhookUrl}
                    onChange={(e) => setN8nSmsWebhookUrl(e.target.value)}
                    placeholder="https://n8n.soniqueteflamenco.com/webhook/zadarma-sms"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <Label>Zadarma API Key (opcional)</Label>
                    <Input
                      type="password"
                      value={zadarmaSmsKey}
                      onChange={(e) => setZadarmaSmsKey(e.target.value)}
                      placeholder="Key de Zadarma"
                    />
                  </div>
                  <div>
                    <Label>Zadarma API Secret (opcional)</Label>
                    <Input
                      type="password"
                      value={zadarmaSmsSecret}
                      onChange={(e) => setZadarmaSmsSecret(e.target.value)}
                      placeholder="Secret de Zadarma"
                    />
                  </div>
                  <div>
                    <Label>Remitente SMS (Sender ID)</Label>
                    <Input
                      value={zadarmaSmsCallerId}
                      onChange={(e) => setZadarmaSmsCallerId(e.target.value)}
                      placeholder="Soniquete"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoSendBookingSms}
                    onChange={(e) => setAutoSendBookingSms(e.target.checked)}
                  />
                  Enviar SMS automático al cliente cuando el agente confirme o modifique una cita
                </label>
              </div>
            </div>

            {canConfigure && (
              <Button type="submit" disabled={isPending}>
                Guardar configuración de VAPI, Zadarma y SMS
              </Button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
