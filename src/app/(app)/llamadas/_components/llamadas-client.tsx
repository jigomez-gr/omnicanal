"use client"

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  FileText,
  Headphones,
  MessageSquareText,
  Mic,
  Pause,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings2,
  User,
  Volume2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useRef, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  syncVapiCallsServerAction,
  toggleCallReviewServerAction,
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    "registro" | "estudio_voz" | "sms_zadarma" | "ajustes_vapi"
  >("registro")
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  // Filtros de llamadas
  const [search, setSearch] = useState("")
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [consultedFilter, setConsultedFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  // Modal Detalle & Transcripción
  const [modalCallId, setModalCallId] = useState<string | null>(null)

  // Reproductor de audio inline
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Estados llamada saliente
  const [testCallPhone, setTestCallPhone] = useState("+34649453996")
  const [testCallName, setTestCallName] = useState("José Ignacio (Prueba VAPI)")

  // Estados envío SMS Zadarma directo
  const [smsPhone, setSmsPhone] = useState("+34649453996")
  const [smsText, setSmsText] = useState(
    "🎸 [SONIQUETE FLAMENCO] Confirmada nuestra reunión de contratación artística. Te hemos enviado el dossier y vídeos a tu correo.",
  )

  // Estados Configuración VAPI & Zadarma
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

  // Reproducir audio con proxy autenticado
  function handlePlayAudio(callId: string) {
    if (playingAudioId === callId) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setPlayingAudioId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(`/api/calls/${callId}/recording`)
    audioRef.current = audio
    setPlayingAudioId(callId)

    audio
      .play()
      .then(() => {
        setPlayingAudioId(callId)
      })
      .catch((err) => {
        console.warn("No se pudo iniciar reproducción:", err)
        setPlayingAudioId(null)
      })

    audio.onended = () => setPlayingAudioId(null)
    audio.onerror = () => {
      setFeedback("No se pudo reproducir la grabación (o aún se está procesando en VAPI).")
      setPlayingAudioId(null)
    }
  }

  // Filtrado de llamadas
  const filteredCalls = useMemo(() => {
    return data.calls.filter((call) => {
      // 1. Búsqueda por texto (teléfono, nombre del interlocutor, o resumen)
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesPhone = call.phoneNumber?.toLowerCase().includes(q)
        const matchesName = call.callerName?.toLowerCase().includes(q)
        const matchesSummary = call.summary?.toLowerCase().includes(q)
        if (!matchesPhone && !matchesName && !matchesSummary) {
          return false
        }
      }

      // 2. Dirección
      if (directionFilter !== "all" && call.direction !== directionFilter) {
        return false
      }

      // 3. Estado
      if (statusFilter !== "all") {
        if (statusFilter === "completed" && call.status !== "completed" && call.status !== "ended") {
          return false
        }
        if (statusFilter === "in-progress" && call.status !== "in-progress") {
          return false
        }
        if (statusFilter === "failed" && call.status !== "failed") {
          return false
        }
      }

      // 4. Consultadas / Revisadas
      if (consultedFilter === "needs_review" && !call.needsReview) {
        return false
      }
      if (consultedFilter === "consulted" && !call.isConsulted) {
        return false
      }
      if (consultedFilter === "pending" && (call.isConsulted || call.needsReview)) {
        return false
      }

      // 5. Filtro por fecha
      if (dateFilter !== "all") {
        const callDate = new Date(call.startedAt)
        const now = new Date()
        if (dateFilter === "today") {
          const isToday =
            callDate.getDate() === now.getDate() &&
            callDate.getMonth() === now.getMonth() &&
            callDate.getFullYear() === now.getFullYear()
          if (!isToday) return false
        } else if (dateFilter === "week") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (callDate < sevenDaysAgo) return false
        } else if (dateFilter === "month") {
          const isThisMonth =
            callDate.getMonth() === now.getMonth() &&
            callDate.getFullYear() === now.getFullYear()
          if (!isThisMonth) return false
        }
      }

      return true
    })
  }, [data.calls, search, directionFilter, statusFilter, consultedFilter, dateFilter])

  const modalCall = data.calls.find((c) => c.id === modalCallId) ?? null

  return (
    <div className="space-y-6">
      {/* Audio element oculto */}
      <audio ref={audioRef} className="hidden" />

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

      {/* Barra superior con navegación de pestañas y botones de acción */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        {/* Pestañas estilo CRM Salvadora */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-2 md:border-b-0 md:pb-0">
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

        {/* Botones de acción principales (Sincronizar VAPI, Actualizar, Probar Saliente, Probar SMS) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const res = await syncVapiCallsServerAction()
                setFeedback(res.message)
                router.refresh()
              })
            }}
            className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            title="Sincronizar grabaciones de audio, transcripciones y costes desde VAPI"
          >
            <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
            Sincronizar con VAPI
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => router.refresh()}
            className="gap-1.5"
            title="Recargar llamadas de la base de datos"
          >
            <RefreshCw className="size-3.5" />
            Actualizar
          </Button>

          <Button
            size="sm"
            variant="default"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const res = await triggerOutboundCallServerAction({
                  phoneNumber: "+34649453996",
                  callerName: "José Ignacio",
                })
                setFeedback(res.message)
              })
            }}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <PhoneOutgoing className="size-4" />
            📞 Probar llamada a mi móvil
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const res = await sendZadarmaSmsServerAction({
                  toPhone: "+34649453996",
                  message:
                    "🎸 [SONIQUETE FLAMENCO] Prueba de verificación SMS desde soniqueteflamenco.com",
                })
                if (res.ok) {
                  setFeedback(
                    `SMS enviado con éxito por Zadarma a +${res.log.toPhone} (coste: ${res.log.cost || "0.04 EUR"}).`,
                  )
                } else {
                  setFeedback(`Aviso de Zadarma: ${res.log.errorMessage || res.log.status}.`)
                }
              })
            }}
            className="gap-1.5"
          >
            <Send className="size-4" />
            💬 Probar SMS a mi móvil
          </Button>
        </div>
      </div>

      {/* ─── TAB 1: REGISTRO DE LLAMADAS (TABLA, FILTROS Y AUDIO PLAYBACK IDÉNTICO A CRM SALVADORA) ─── */}
      {activeTab === "registro" && (
        <div className="space-y-4">
          {/* Tarjetas KPI Superiores (exacto a CRM Salvadora) */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total llamadas</span>
                <PhoneCall className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold">{data.stats?.totalCalls ?? data.calls.length}</p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Requieren Revisión</span>
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {data.stats?.needsReviewCount ?? 0}
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Tiempo Total Hablado</span>
                <Clock className="size-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold">
                {Math.round((data.stats?.totalDurationSeconds ?? 0) / 60)} min
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Coste Acumulado</span>
                <DollarSign className="size-4 text-purple-600" />
              </div>
              <p className="mt-2 text-2xl font-bold">
                ${(((data.stats?.totalCostCents ?? 0) / 100)).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Formulario rápido para lanzar llamada */}
          {canManage && (
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Lanzar Llamada Saliente con el Agente IA VAPI (vía SIP Trunk Zadarma)
                </h3>
                <span className="text-xs text-muted-foreground">
                  Caller ID: {data.config.zadarmaPhoneNumber || "+34919933764"}
                </span>
              </div>
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
                    router.refresh()
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
                <Button type="submit" disabled={isPending} className="bg-primary">
                  <PhoneOutgoing className="mr-1.5 size-4" />
                  Llamar ahora
                </Button>
              </form>
            </div>
          )}

          {/* Barra de Filtros interactiva (Búsqueda, Dirección, Estado, Consultadas/Revisadas, Fecha) */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por teléfono, cliente o resumen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Selector de Dirección */}
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las direcciones</option>
              <option value="inbound">Entrantes</option>
              <option value="outbound">Salientes</option>
            </select>

            {/* Selector de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todo el estado</option>
              <option value="completed">Finalizada</option>
              <option value="in-progress">En curso</option>
              <option value="failed">Fallida</option>
            </select>

            {/* Selector por Consultadas / Revisadas */}
            <select
              value={consultedFilter}
              onChange={(e) => setConsultedFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Consultadas & Revisión (Todas)</option>
              <option value="needs_review">⚠️ Requiere Revisión</option>
              <option value="consulted">✅ Consultadas / Resueltas</option>
              <option value="pending">⏳ Pendientes de consultar</option>
            </select>

            {/* Selector por Fecha */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Este mes</option>
            </select>

            {(search || directionFilter !== "all" || statusFilter !== "all" || consultedFilter !== "all" || dateFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setDirectionFilter("all")
                  setStatusFilter("all")
                  setConsultedFilter("all")
                  setDateFilter("all")
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Tabla idéntica a CRM Salvadora */}
          {filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <PhoneCall className="size-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold">No se encontraron llamadas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Prueba cambiando los filtros de fecha o búsqueda, o pulsa en «Sincronizar con VAPI» para descargar las llamadas recientes.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Tipo / Teléfono</th>
                      <th className="px-4 py-3">Contacto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Duración</th>
                      <th className="px-4 py-3">Fecha y Hora</th>
                      <th className="px-4 py-3">Coste</th>
                      <th className="px-4 py-3">Grabación</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCalls.map((call) => {
                      const isIncoming = call.direction === "inbound"
                      const dateObj = new Date(call.startedAt)
                      const isPlaying = playingAudioId === call.id
                      const hasRecording = Boolean(call.recordingUrl || call.vapiCallId)

                      return (
                        <tr key={call.id} className="transition-colors hover:bg-muted/30">
                          {/* 1. Tipo / Teléfono */}
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              {isIncoming ? (
                                <span
                                  className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                                  title="Llamada entrante"
                                >
                                  <PhoneIncoming className="size-4" />
                                </span>
                              ) : (
                                <span
                                  className="flex size-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
                                  title="Llamada saliente"
                                >
                                  <PhoneOutgoing className="size-4" />
                                </span>
                              )}
                              <div>
                                <p className="font-semibold text-foreground">
                                  {call.phoneNumber || "Número desconocido"}
                                </p>
                                <span className="text-xs capitalize text-muted-foreground">
                                  {call.direction}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Contacto */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <User className="size-3.5 text-muted-foreground" />
                              <span>{call.callerName || "Sin asociar"}</span>
                            </div>
                          </td>

                          {/* 3. Estado */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {call.status === "completed" || call.status === "ended" ? (
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                  Finalizada
                                </Badge>
                              ) : call.status === "in-progress" ? (
                                <Badge variant="secondary" className="border-amber-500/30 text-amber-600">
                                  En curso
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  {call.status}
                                </Badge>
                              )}

                              {call.needsReview ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                  <AlertTriangle className="size-3" />
                                  Revisar
                                </span>
                              ) : call.isConsulted ? (
                                <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                  Consultada
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* 4. Duración */}
                          <td className="px-4 py-3 font-mono text-xs">
                            {call.durationSeconds ? `${call.durationSeconds}s` : "—"}
                          </td>

                          {/* 5. Fecha y Hora */}
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {dateObj.toLocaleString("es-ES", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          {/* 6. Coste */}
                          <td className="px-4 py-3 font-mono text-xs">
                            {call.costCents ? `$${(call.costCents / 100).toFixed(2)}` : "—"}
                          </td>

                          {/* 7. Grabación (Audio Playback) */}
                          <td className="px-4 py-3">
                            {hasRecording ? (
                              <button
                                type="button"
                                onClick={() => handlePlayAudio(call.id)}
                                className={`flex size-7 items-center justify-center rounded-full transition-all shadow-xs ${
                                  isPlaying
                                    ? "bg-primary text-primary-foreground animate-pulse"
                                    : "bg-muted text-foreground hover:bg-primary/20 hover:text-primary"
                                }`}
                                title={isPlaying ? "Pausar audio" : "Escuchar voz de la llamada"}
                              >
                                {isPlaying ? (
                                  <Pause className="size-3.5 fill-current" />
                                ) : (
                                  <Play className="size-3.5 fill-current ml-0.5" />
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sin audio</span>
                            )}
                          </td>

                          {/* 8. Acciones (Detalle & Transcripción) */}
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setModalCallId(call.id)}
                              className="h-8 px-2.5 text-xs"
                            >
                              Detalle & Transcripción
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal / Diálogo de Detalle & Transcripción */}
          <Dialog open={Boolean(modalCallId)} onOpenChange={(open) => !open && setModalCallId(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              {modalCall ? (
                <div className="space-y-4">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-lg font-bold">
                        {modalCall.callerName || "Interlocutor"} · {modalCall.phoneNumber}
                      </DialogTitle>
                      <Badge variant="outline">{modalCall.status}</Badge>
                    </div>
                    <DialogDescription className="text-xs">
                      ID VAPI: <code>{modalCall.vapiCallId || modalCall.id}</code> · Duración:{" "}
                      {modalCall.durationSeconds} s · Coste:{" "}
                      {modalCall.costCents ? `$${(modalCall.costCents / 100).toFixed(2)}` : "$0.00"} ·{" "}
                      {new Date(modalCall.startedAt).toLocaleString("es-ES")}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Reproductor de Audio Completo */}
                  <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Volume2 className="size-4 text-primary" />
                        Grabación de la Llamada de Voz
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Audio oficial VAPI / Zadarma
                      </span>
                    </div>
                    <audio
                      controls
                      className="w-full"
                      src={`/api/calls/${modalCall.id}/recording`}
                    />
                  </div>

                  {/* Acciones de Consulta y Revisión */}
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2.5">
                    <span className="text-xs font-medium text-muted-foreground">Estado de gestión:</span>
                    <Button
                      size="sm"
                      variant={modalCall.isConsulted ? "default" : "outline"}
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await toggleCallReviewServerAction({
                            callId: modalCall.id,
                            isConsulted: !modalCall.isConsulted,
                            needsReview: false,
                          })
                          setFeedback(
                            modalCall.isConsulted
                              ? "Llamada desmarcada como consultada."
                              : "Llamada marcada como consultada y resuelta.",
                          )
                          router.refresh()
                        })
                      }}
                      className="h-7 text-xs"
                    >
                      <CheckCircle2 className="mr-1 size-3.5" />
                      {modalCall.isConsulted ? "Consultada (Resuelta)" : "Marcar como Consultada"}
                    </Button>

                    <Button
                      size="sm"
                      variant={modalCall.needsReview ? "destructive" : "outline"}
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await toggleCallReviewServerAction({
                            callId: modalCall.id,
                            needsReview: !modalCall.needsReview,
                          })
                          setFeedback(
                            modalCall.needsReview
                              ? "Llamada retirada de revisión."
                              : "Llamada marcada como 'Requiere Revisión'.",
                          )
                          router.refresh()
                        })
                      }}
                      className="h-7 text-xs"
                    >
                      <AlertTriangle className="mr-1 size-3.5" />
                      {modalCall.needsReview ? "Pendiente de Revisión" : "Marcar para Revisar"}
                    </Button>
                  </div>

                  {/* Resumen IA */}
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      Resumen IA de la Conversación
                    </h4>
                    <p className="rounded-lg bg-muted/30 p-3 text-xs leading-relaxed">
                      {modalCall.summary || "No hay resumen generado aún para esta llamada."}
                    </p>
                  </div>

                  {/* Transcripción Completa */}
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      Transcripción Completa
                    </h4>
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 font-sans text-xs leading-relaxed">
                      {modalCall.transcript || "Sin transcripción disponible."}
                    </pre>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
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
                  if (res.ok) {
                    setFeedback(
                      `SMS enviado con éxito por Zadarma hacia ${res.log.toPhone} (coste: ${res.log.cost || "0.04 EUR"}).`,
                    )
                  } else {
                    setFeedback(
                      `Aviso de Zadarma: ${res.log.errorMessage || res.log.status}.`,
                    )
                  }
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

      {/* TAB 4: AJUSTES VAPI & ZADARMA SIP TRUNK */}
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

            {/* SECCIÓN LÍNEA SALIENTE DE ZADARMA */}
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
