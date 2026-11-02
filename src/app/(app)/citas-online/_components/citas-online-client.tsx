"use client"

import {
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  Video,
} from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { getCalcomConfig, getFlamencoHubSnapshot } from "@/data/flamenco"
import {
  createOnlineMeetingCalcomAction,
  saveCalcomConfigOnlineAction,
  testCalcomConnectionOnlineAction,
} from "../actions"

type CalcomData = Awaited<ReturnType<typeof getCalcomConfig>>
type HubData = Awaited<ReturnType<typeof getFlamencoHubSnapshot>>

export function CitasOnlineClient({
  calcom,
  hub,
  canManage,
  canConfigure,
}: {
  calcom: CalcomData
  hub: HubData
  canManage: boolean
  canConfigure: boolean
}) {
  const [activeTab, setActiveTab] = useState<"reuniones" | "configuracion">("reuniones")
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  // Estados de Configuración Cal.com (idéntico a crm_salvadora)
  const [calEnabled, setCalEnabled] = useState(calcom.enabled)
  const [calApiKey, setCalApiKey] = useState(calcom.maskedApiKey ?? "")
  const [calBaseUrl, setCalBaseUrl] = useState(calcom.baseUrl)
  const [calEventTypeId, setCalEventTypeId] = useState(calcom.defaultEventTypeId)
  const [calAutoSync, setCalAutoSync] = useState(calcom.autoSyncBookings)

  // Estados para Agendar Nueva Cita Online Cal.com (con selector de Modalidad idéntico a crm_salvadora)
  const [modality, setModality] = useState<"virtual" | "phone" | "in_person">("virtual")
  const [title, setTitle] = useState(
    "Reunión Virtual de Contratación y Producción · Soniquete Flamenco",
  )
  const [artistId, setArtistId] = useState(hub.artists[0]?.id ?? "")
  const [venueId, setVenueId] = useState(hub.venues[0]?.id ?? "")
  const [startsAtIso, setStartsAtIso] = useState(() => {
    const d = new Date(Date.now() + 2 * 86400_000)
    d.setHours(11, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [durationMinutes, setDurationMinutes] = useState("45")
  const [attendeePhone, setAttendeePhone] = useState("+34 611 222 333")
  const [sendSmsConfirmation, setSendSmsConfirmation] = useState(true)
  const [notes, setNotes] = useState(
    "Revisión de rider técnico, caché, fechas disponibles y envío del pack de 9 vídeos .mp4.",
  )

  const meetingsWithCalcom = hub.concerts.filter((c) => Boolean(c.calcomMeetingUrl))

  return (
    <div className="space-y-6">
      {/* KPIs Superiores */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Estado Integración Cal.com API v2</div>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant={calEnabled ? "default" : "secondary"}>
              {calEnabled ? "Cal.com Activo (Sincronización ON)" : "Cal.com Desactivado"}
            </Badge>
            {calcom.hasApiKey ? (
              <Badge variant="outline">API Key Cifrada ({calcom.maskedApiKey})</Badge>
            ) : (
              <Badge variant="outline">Modo Enlace Instantáneo</Badge>
            )}
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">
            Endpoint: <span className="font-mono">{calBaseUrl}</span> · Event Type ID:{" "}
            <span className="font-mono">{calEventTypeId || "Por defecto"}</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">
            Citas Online con Sala de Videollamada Activa
          </div>
          <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {meetingsWithCalcom.length}
          </div>
          <div className="text-xs text-muted-foreground">
            Salas virtuales `app.cal.com/video/...` listas para unirse en 1 clic
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Accesos Rápidos de Agenda</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/agenda">
                <Calendar className="mr-1.5 size-3.5" />
                Abrir Calendario General
              </Link>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setActiveTab("configuracion")}
            >
              <Settings2 className="mr-1.5 size-3.5" />
              Configurar API Key Cal.com
            </Button>
          </div>
        </div>
      </div>

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

      {/* Selector de Pestañas */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          variant={activeTab === "reuniones" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("reuniones")}
          className="gap-1.5"
        >
          <Video className="size-4" />
          Citas Virtuales y Videollamadas Cal.com ({meetingsWithCalcom.length})
        </Button>
        <Button
          variant={activeTab === "configuracion" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("configuracion")}
          className="gap-1.5"
        >
          <Settings2 className="size-4" />
          Configuración de Cal.com (API v2 y Event Type ID)
        </Button>
      </div>

      {/* PESTAÑA 1: REUNIONES VIRTUALES CAL.COM + CREAR CITA ONLINE */}
      {activeTab === "reuniones" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h3 className="text-base font-bold">
              Salas de Videollamada y Reuniones Online (Cal.com)
            </h3>

            {meetingsWithCalcom.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Aún no hay reuniones online con enlace de Cal.com. Crea una desde el formulario de la derecha.
              </div>
            ) : (
              <div className="space-y-3">
                {meetingsWithCalcom.map((m) => {
                  const artist = hub.artists.find((a) => a.id === m.artistId)
                  const venue = hub.venues.find((v) => v.id === m.venueId)
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-indigo-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">
                              <Video className="mr-1 size-3" />
                              Virtual (Cal.com)
                            </Badge>
                            <h4 className="font-bold">{m.title}</h4>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Intérprete: <strong>{artist?.artisticName ?? "Catálogo General"}</strong>
                            {venue ? ` · Sala / Entidad: ${venue.name} (${venue.city})` : ""}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Fecha y hora:{" "}
                            <strong>
                              {new Date(m.startsAt).toLocaleString("es-ES", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </strong>{" "}
                            · Duración: {m.durationMinutes} min
                            {m.calcomBookingUid ? ` · UID: ${m.calcomBookingUid}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Tarjeta de enlace Cal.com idéntica a crm_salvadora */}
                      {m.calcomMeetingUrl ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900 dark:bg-indigo-950/40">
                          <div className="flex items-center gap-2">
                            <Video className="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <div>
                              <span className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                                Reunión Virtual Cal.com
                              </span>
                              <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                                {m.calcomMeetingUrl}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(m.calcomMeetingUrl!)
                                setFeedback("Enlace de videollamada Cal.com copiado al portapapeles.")
                              }}
                            >
                              <Copy className="mr-1 size-3.5" />
                              Copiar enlace
                            </Button>
                            <a
                              href={m.calcomMeetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                            >
                              <Video className="size-3.5" />
                              Unirse a videollamada
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* FORMULARIO: AGENDAR NUEVA CITA ONLINE CAL.COM (con Modalidad Presencial / Telefónica / Virtual Cal.com) */}
          {canManage && (
            <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-5">
              <div className="mb-4 flex items-center gap-2.5 border-b pb-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400">
                  <Video className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Agendar Cita Online (Cal.com)</h3>
                  <p className="text-xs text-muted-foreground">
                    Genera sala de videollamada en Cal.com y avisa por SMS de Zadarma
                  </p>
                </div>
              </div>

              <form
                className="space-y-3.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  startTransition(async () => {
                    const created = await createOnlineMeetingCalcomAction({
                      title: `[${modality === "virtual" ? "Virtual Cal.com" : modality === "phone" ? "Telefónica" : "Presencial"}] ${title}`,
                      artistId,
                      venueId: venueId || null,
                      startsAtIso: new Date(startsAtIso).toISOString(),
                      durationMinutes: Number(durationMinutes) || 45,
                      attendeePhone,
                      sendSmsConfirmation,
                      notes,
                    })
                    setFeedback(
                      `Cita Online creada con sala Cal.com (${created.calcomMeetingUrl ?? "activa"}).`,
                    )
                  })
                }}
              >
                {/* Selector de Modalidad de la Cita idéntico a crm_salvadora */}
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold">
                    Modalidad de la Cita *
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setModality("in_person")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                        modality === "in_person"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <MapPin className="size-3.5" />
                      Presencial
                    </button>
                    <button
                      type="button"
                      onClick={() => setModality("phone")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                        modality === "phone"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Phone className="size-3.5" />
                      Telefónica
                    </button>
                    <button
                      type="button"
                      onClick={() => setModality("virtual")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                        modality === "virtual"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Video className="size-3.5" />
                      Virtual (Cal.com)
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Título / Motivo de la Reunión *</Label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Intérprete / Artista *</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={artistId}
                      onChange={(e) => setArtistId(e.target.value)}
                      required
                    >
                      {hub.artists.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.artisticName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Sala / Ateneo / Promotor (opcional)</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={venueId}
                      onChange={(e) => setVenueId(e.target.value)}
                    >
                      <option value="">-- Cualquier sala / General --</option>
                      {hub.venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fecha y Hora *</Label>
                    <Input
                      type="datetime-local"
                      required
                      value={startsAtIso}
                      onChange={(e) => setStartsAtIso(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Duración (min)</Label>
                    <Input
                      type="number"
                      min={15}
                      max={240}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Teléfono del asistente (para SMS Zadarma)</Label>
                  <Input
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div>
                  <Label>Notas para la convocatoria Cal.com</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={sendSmsConfirmation}
                    onChange={(e) => setSendSmsConfirmation(e.target.checked)}
                  />
                  Enviar SMS de confirmación automática por Zadarma al crear la cita
                </label>

                <Button type="submit" disabled={isPending || !artistId} className="w-full">
                  <Plus className="mr-1.5 size-4" />
                  {isPending
                    ? "Creando sala en Cal.com…"
                    : "Crear Cita Online y Generar Enlace Cal.com"}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: CONFIGURACIÓN CAL.COM API V2 (IDÉNTICA A CRM_SALVADORA) */}
      {activeTab === "configuracion" && (
        <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                <Video className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  Integración con Cal.com (Citas Virtuales)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sincroniza las citas virtuales automáticamente con Cal.com y genera enlaces de videollamada para salas, promotores y artistas.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={calEnabled}
                onChange={(e) => setCalEnabled(e.target.checked)}
              />
              Cal.com Activo
            </label>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              startTransition(async () => {
                await saveCalcomConfigOnlineAction({
                  enabled: calEnabled,
                  apiKey: calApiKey,
                  baseUrl: calBaseUrl,
                  defaultEventTypeId: calEventTypeId,
                  autoSyncBookings: calAutoSync,
                })
                setFeedback(
                  "Configuración de Cal.com API v2 guardada y cifrada con APP_ENCRYPTION_KEY.",
                )
              })
            }}
          >
            <div>
              <Label>API Key de Cal.com</Label>
              <Input
                type="password"
                value={calApiKey}
                onChange={(e) => setCalApiKey(e.target.value)}
                placeholder="cal_live_... o tu clave de API"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Puedes obtener tu API Key en Cal.com → Settings → Developer → API Keys. Se guarda cifrada en servidor.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>URL Base de la API</Label>
                <Input
                  value={calBaseUrl}
                  onChange={(e) => setCalBaseUrl(e.target.value)}
                  placeholder="https://api.cal.com/v2"
                />
              </div>
              <div>
                <Label>ID de Evento Predeterminado (Event Type ID)</Label>
                <Input
                  value={calEventTypeId}
                  onChange={(e) => setCalEventTypeId(e.target.value)}
                  placeholder="ej. 4252426 o ID de evento"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={calAutoSync}
                onChange={(e) => setCalAutoSync(e.target.checked)}
              />
              Habilitar sincronización automática con Cal.com para citas virtuales y llamadas VAPI
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              {canConfigure && (
                <Button type="submit" disabled={isPending}>
                  <Settings2 className="mr-1.5 size-4" />
                  Guardar Cal.com
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await testCalcomConnectionOnlineAction()
                    setFeedback(res.message)
                  })
                }}
              >
                <RefreshCw className="mr-1.5 size-4" />
                Probar conexión con Cal.com
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
