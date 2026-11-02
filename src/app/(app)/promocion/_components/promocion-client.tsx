"use client"

import {
  AlertTriangle,
  BellRing,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  FileSignature,
  Film,
  Globe,
  Guitar,
  Image as ImageIcon,
  Layers,
  Megaphone,
  Music,
  PlayCircle,
  Plus,
  Send,
  Sparkles,
  UserCheck,
  Users,
  Video,
} from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { getFlamencoHubSnapshot } from "@/data/flamenco"
import {
  ARTIST_DISCIPLINE_LABELS,
  CONCERT_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  EVENT_KIND_LABELS,
  FLAMENCO_MEDIA_PIECES,
  MEDIA_COMBINATION_GUIDE,
  MEDIA_SOURCE_PLATFORM_LABELS,
  VENUE_KIND_LABELS,
  type ArtistDiscipline,
  type EventKind,
  type MediaSourcePlatform,
  type VenueKind,
} from "@/lib/flamenco/catalog"
import {
  confirmProvisionalBookingAction,
  createArtistAction,
  createArtistDigitalServiceAction,
  createConcertAction,
  createContractAction,
  createMediaAssetAction,
  createProvisionalBookingAction,
  createRepresentativeAction,
  createVenueAction,
  evaluateMinAttendeesAction,
  generateFullMediaPackServerAction,
  notifyProvisionalBookingsAction,
  scrapeWebEntityAction,
  simulateConcertOfferAction,
} from "../actions"

type Snapshot = Awaited<ReturnType<typeof getFlamencoHubSnapshot>>

type TabKey =
  | "interpretes"
  | "multimedia"
  | "salas"
  | "conciertos"
  | "simulador"
  | "captacion_web"
  | "servicios_artistas"
  | "representantes"

export function PromocionClient({
  snapshot,
  canManage,
}: {
  snapshot: Snapshot
  canManage: boolean
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("interpretes")
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [selectedArtistIdForMedia, setSelectedArtistIdForMedia] = useState<string>(
    snapshot.artists[0]?.id ?? "",
  )
  const [selectedConcertIdForMedia, setSelectedConcertIdForMedia] = useState<string>("")
  const [expandedArtistIdForVideos, setExpandedArtistIdForVideos] = useState<string | null>(
    snapshot.artists[0]?.id ?? null,
  )

  // Estados formulario nuevo intérprete
  const [artisticName, setArtisticName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [discipline, setDiscipline] = useState<ArtistDiscipline>("cante")
  const [stylesText, setStylesText] = useState("Soleá, Bulerías, Alegrías, Seguiriya")
  const [bringsGroup, setBringsGroup] = useState(true)
  const [groupFormation, setGroupFormation] = useState(
    "Cante solista + guitarra titular + 2 palmeros + bailaora invitada",
  )
  const [leadGuitarist, setLeadGuitarist] = useState("Diego del Morón")
  const [altGuitarists, setAltGuitarists] = useState("Paco Heredia, Curro de Jerez")
  const [baseCacheEur, setBaseCacheEur] = useState("2200")
  const [artistCity] = useState("Madrid")
  const [artistEmail, setArtistEmail] = useState("")
  const [artistPhone, setArtistPhone] = useState("")
  const [artistWeb, setArtistWeb] = useState("")
  const [artistBio, setArtistBio] = useState("")

  // Estados formulario nueva pieza multimedia (estándar o abierta / YouTube)
  const [pieceCode, setPieceCode] = useState<string>(FLAMENCO_MEDIA_PIECES[0].code)
  const [customPieceLabel, setCustomPieceLabel] = useState("")
  const [sourcePlatform, setSourcePlatform] = useState<MediaSourcePlatform>("plataforma")
  const [customTitle, setCustomTitle] = useState("")
  const [pieceUrl, setPieceUrl] = useState("")
  const [customUse, setCustomUse] = useState("")

  // Estados formulario nueva sala
  const [venueName, setVenueName] = useState("")
  const [venueKind, setVenueKind] = useState<VenueKind>("sala_flamenco")
  const [venueCity, setVenueCity] = useState("Madrid")
  const [venueCapacity, setVenueCapacity] = useState("200")
  const [venueBudget, setVenueBudget] = useState("2400")
  const [venueProgrammer, setVenueProgrammer] = useState("")
  const [venueEmail, setVenueEmail] = useState("")
  const [venuePhone, setVenuePhone] = useState("")
  const [venueWeb, setVenueWeb] = useState("")

  // Estados formulario Concierto / Evento (viaje, conferencia, entrevista, etc.)
  const [concertTitle, setConcertTitle] = useState("")
  const [eventKind, setEventKind] = useState<EventKind>("concierto")
  const [concertArtistId, setConcertArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [concertVenueId, setConcertVenueId] = useState(snapshot.venues[0]?.id ?? "")
  const [concertDate, setConcertDate] = useState("2026-11-28T21:00")
  const [dateAndPlaceTbd, setDateAndPlaceTbd] = useState(false)
  const [provisionalBookingsOpen, setProvisionalBookingsOpen] = useState(true)
  const [autoNotifyToConfirm, setAutoNotifyToConfirm] = useState(true)
  const [cancelIfBelowMinAttendees, setCancelIfBelowMinAttendees] = useState(true)
  const [minAttendees, setMinAttendees] = useState("30")
  const [currentAttendees, setCurrentAttendees] = useState("12")
  const [concertCache, setConcertCache] = useState("2500")
  const [concertGuitarist, setConcertGuitarist] = useState("Diego del Morón")

  // Estados formulario reserva provisional para un evento
  const [provEventId, setProvEventId] = useState(snapshot.concerts[0]?.id ?? "")
  const [provName, setProvName] = useState("")
  const [provEmail, setProvEmail] = useState("")
  const [provPhone, setProvPhone] = useState("")
  const [provSeats, setProvSeats] = useState("2")

  const [contractCode, setContractCode] = useState(`CNT-${new Date().getFullYear()}-009`)
  const [contractArtistId, setContractArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [contractVenueId, setContractVenueId] = useState(snapshot.venues[0]?.id ?? "")
  const [contractTotalEur, setContractTotalEur] = useState("2500")

  // Estados Simulador de Ofertas a Salas -> Envíos
  const [offerTitle, setOfferTitle] = useState("Gira de Otoño · Recital Flamenco & Cuadro")
  const [offerArtistId, setOfferArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [offerVenueId, setOfferVenueId] = useState(snapshot.venues[0]?.id ?? "")
  const [offerTargetKind, setOfferTargetKind] = useState<VenueKind>("sala_flamenco")
  const [offerDateText, setOfferDateText] = useState("Viernes 14 o Sábado 15 de Noviembre · 21:00 h")
  const [offerCacheEur, setOfferCacheEur] = useState("2200")
  const [offerGuitarist, setOfferGuitarist] = useState("Diego del Morón")
  const [offerIncludesGroup, setOfferIncludesGroup] = useState(true)
  const [offerPushToEnvios, setOfferPushToEnvios] = useState(true)

  // Estados Captación Web de Salas y Artistas
  const [scrapeTargetType, setScrapeTargetType] = useState<"venue" | "artist">("venue")
  const [scrapeUrl, setScrapeUrl] = useState("https://cardamomo.com")
  const [scrapeName, setScrapeName] = useState("")
  const [scrapeCity, setScrapeCity] = useState("Madrid")
  const [scrapeVenueKind, setScrapeVenueKind] = useState<VenueKind>("tablao")

  // Estados Servicios Digitales para Artistas
  const [serviceArtistId, setServiceArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [servicePresetIdx, setServicePresetIdx] = useState(0)
  const [serviceDomain, setServiceDomain] = useState("carmenlatrianera.soniqueteflamenco.com")

  // Estados Representante
  const [repName, setRepName] = useState("")
  const [repAgency, setRepAgency] = useState("Soniquete con Arte Management")
  const [repCommission, setRepCommission] = useState("15")
  const [repEmail, setRepEmail] = useState("")
  const [repPhone, setRepPhone] = useState("")

  const filteredMediaAssets = snapshot.mediaAssets.filter((m) => {
    if (selectedConcertIdForMedia) return m.concertId === selectedConcertIdForMedia
    if (selectedArtistIdForMedia) return m.artistId === selectedArtistIdForMedia
    return true
  })

  return (
    <div className="space-y-6">
      {/* Banner Resumen Agencia */}
      <div className="rounded-2xl border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default">Soniquete con Arte · Promoción Flamenca</Badge>
              <Badge variant="outline">soniqueteflamenco.com</Badge>
              <Badge variant="secondary">@soniqueteflamencoMadrid</Badge>
            </div>
            <h2 className="text-lg font-semibold">
              Centro Integral de Promoción de Intérpretes, Conciertos, Viajes, Conferencias, Entrevistas y Salas
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestiona intérpretes (con sus vídeos de conciertos en la plataforma o vía YouTube y multimedia abierto), eventos con mínimo de asistentes para no cancelarse y reservas provisionales cuando aún no se sabe fecha/lugar con aviso automático para confirmar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-center">
              <div className="text-xl font-bold">{snapshot.artists.length}</div>
              <div className="text-xs text-muted-foreground">Intérpretes</div>
            </div>
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-center">
              <div className="text-xl font-bold">{snapshot.venues.length}</div>
              <div className="text-xs text-muted-foreground">Salas y Ateneos</div>
            </div>
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-center">
              <div className="text-xl font-bold">{snapshot.concerts.length}</div>
              <div className="text-xs text-muted-foreground">Conciertos y Eventos</div>
            </div>
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-center">
              <div className="text-xl font-bold">{snapshot.mediaAssets.length}</div>
              <div className="text-xs text-muted-foreground">Multimedia / YouTube</div>
            </div>
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

      {/* Pestañas de navegación */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          { key: "interpretes", label: "1. Intérpretes y Vídeos Conciertos/YouTube", icon: Music },
          { key: "multimedia", label: "2. Pack 9 Vídeos .MP4 + Multimedia Abierto", icon: Film },
          { key: "salas", label: "3. Salas, Ateneos y Admón.", icon: Building2 },
          { key: "conciertos", label: "4. Conciertos, Eventos y Reservas Provisionales", icon: CalendarCheck2 },
          { key: "simulador", label: "5. Simulador Ofertas → Envíos", icon: Megaphone },
          { key: "captacion_web", label: "6. Captar Salas/Artistas de Web", icon: Globe },
          { key: "servicios_artistas", label: "7. Servicios Digitales a Artistas", icon: Sparkles },
          { key: "representantes", label: "8. Representantes", icon: UserCheck },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <Button
              key={tab.key}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className="gap-1.5"
            >
              <Icon className="size-4" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* TAB 1: INTÉRPRETES (CON VÍDEOS DE CONCIERTOS EN NUESTRA PLATAFORMA, YOUTUBE Y MULTIMEDIA ADICIONAL) */}
      {activeTab === "interpretes" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-base font-semibold">
              Catálogo de Intérpretes en Promoción ({snapshot.artists.length})
            </h3>
            <div className="grid gap-4">
              {snapshot.artists.map((artist) => {
                // Conciertos/eventos donde participa este artista
                const artistConcerts = snapshot.concerts.filter(
                  (c) => c.artistId === artist.id,
                )
                const artistConcertIds = new Set(artistConcerts.map((c) => c.id))
                // Todas las piezas del artista + todas las piezas de sus conciertos
                const allArtistAndConcertMedia = snapshot.mediaAssets.filter(
                  (m) =>
                    m.artistId === artist.id ||
                    (m.concertId && artistConcertIds.has(m.concertId)),
                )
                const concertAndYoutubeVideos = allArtistAndConcertMedia.filter(
                  (m) =>
                    Boolean(m.concertId) ||
                    m.sourcePlatform === "youtube" ||
                    m.pieceCode === "custom_otro",
                )
                const isExpanded = expandedArtistIdForVideos === artist.id

                return (
                  <div
                    key={artist.id}
                    className="rounded-xl border bg-card p-4 shadow-xs transition hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-bold">{artist.artisticName}</h4>
                          <Badge variant="secondary">
                            {ARTIST_DISCIPLINE_LABELS[artist.discipline as ArtistDiscipline] ??
                              artist.discipline}
                          </Badge>
                          <Badge variant="outline">Caché base: {artist.baseCacheEur} €</Badge>
                          {artist.sourceWebExtracted ? (
                            <Badge variant="outline">Captado de Web</Badge>
                          ) : null}
                        </div>
                        {artist.legalName ? (
                          <p className="text-xs text-muted-foreground">
                            Nombre real: {artist.legalName} · Ciudad: {artist.city}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          variant={isExpanded ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setExpandedArtistIdForVideos(isExpanded ? null : artist.id)
                          }
                        >
                          <PlayCircle className="mr-1.5 size-4" />
                          Vídeos de Conciertos y YouTube ({concertAndYoutubeVideos.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedArtistIdForMedia(artist.id)
                            setSelectedConcertIdForMedia("")
                            setActiveTab("multimedia")
                          }}
                        >
                          <Video className="mr-1.5 size-4" />
                          Pack Completo ({allArtistAndConcertMedia.length})
                        </Button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">{artist.biography}</p>

                    <div className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-2">
                      <div>
                        <span className="font-semibold">Palos / Estilos: </span>
                        {Array.isArray(artist.styles) ? artist.styles.join(", ") : "Flamenco"}
                      </div>
                      <div>
                        <span className="font-semibold">¿Lleva grupo propio?: </span>
                        {artist.bringsGroup ? `Sí (${artist.groupFormation})` : "Solista"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Guitar className="size-3.5 text-primary" />
                        <span className="font-semibold">Guitarrista titular: </span>
                        <span>{artist.leadGuitarist || "A designar"}</span>
                      </div>
                      <div>
                        <span className="font-semibold">Guitarristas alternativos: </span>
                        {Array.isArray(artist.alternateGuitarists) &&
                        artist.alternateGuitarists.length > 0
                          ? artist.alternateGuitarists.join(", ")
                          : "Según disponibilidad"}
                      </div>
                    </div>

                    {/* Sección desplegable en la ficha del artista: Vídeos de conciertos en nuestra plataforma, YouTube y otros multimedias abiertos */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 rounded-xl border bg-muted/20 p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="text-xs font-bold uppercase tracking-wide text-primary">
                            🎬 Vídeos de Conciertos (en nuestra plataforma o vía YouTube) y Multimedia Adicional de {artist.artisticName}
                          </h5>
                          {artist.youtubeChannelUrl ? (
                            <a
                              href={artist.youtubeChannelUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 underline dark:text-red-400"
                            >
                              Canal de YouTube del Artista <ExternalLink className="size-3" />
                            </a>
                          ) : null}
                        </div>

                        {concertAndYoutubeVideos.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Aún no hay vídeos de conciertos específicos o enlaces de YouTube adicionales. Puedes añadir cualquier vídeo de YouTube o multimedia libre en la pestaña 2.
                          </p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {concertAndYoutubeVideos.slice(0, 8).map((vid) => {
                              const parentConcert = snapshot.concerts.find(
                                (c) => c.id === vid.concertId,
                              )
                              return (
                                <div
                                  key={vid.id}
                                  className="rounded-lg border bg-card p-3 text-xs shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold">{vid.title}</span>
                                    <Badge
                                      variant={
                                        vid.sourcePlatform === "youtube" ? "default" : "outline"
                                      }
                                      className="text-[10px]"
                                    >
                                      {vid.sourcePlatform === "youtube"
                                        ? "YouTube"
                                        : vid.customPieceLabel || vid.formatLabel}
                                    </Badge>
                                  </div>
                                  {parentConcert ? (
                                    <div className="mt-1 text-[11px] font-medium text-primary">
                                      📍 Evento: {parentConcert.title}
                                    </div>
                                  ) : null}
                                  {vid.youtubeVideoId ? (
                                    <div className="mt-2 aspect-video overflow-hidden rounded-md border bg-black">
                                      <iframe
                                        className="size-full"
                                        src={`https://www.youtube.com/embed/${vid.youtubeVideoId}`}
                                        title={vid.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : null}
                                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    {vid.recommendedUse}
                                  </p>
                                  <div className="mt-2 flex items-center justify-between border-t pt-1.5">
                                    <span className="text-[11px] text-muted-foreground">
                                      {vid.dimensions}
                                    </span>
                                    <a
                                      href={vid.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                    >
                                      {vid.sourcePlatform === "youtube"
                                        ? "Ver en YouTube"
                                        : "Reproducir en plataforma"}{" "}
                                      <ExternalLink className="size-3" />
                                    </a>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {artist.email ? <span>✉️ {artist.email}</span> : null}
                      {artist.phone ? <span>📞 {artist.phone}</span> : null}
                      {artist.instagramHandle ? <span>📸 {artist.instagramHandle}</span> : null}
                      {artist.websiteUrl ? (
                        <a
                          href={artist.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline"
                        >
                          Web oficial <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {canManage && (
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h3 className="mb-3 text-base font-semibold">Dar de alta Intérprete + 12 Piezas</h3>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  startTransition(async () => {
                    const created = await createArtistAction({
                      artisticName,
                      legalName,
                      discipline,
                      biography: artistBio,
                      styles: stylesText
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      bringsGroup,
                      groupFormation,
                      leadGuitarist,
                      alternateGuitarists: altGuitarists
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                      baseCacheEur: Number(baseCacheEur) || 1800,
                      minCacheEur: Math.round((Number(baseCacheEur) || 1800) * 0.75),
                      city: artistCity,
                      email: artistEmail,
                      phone: artistPhone,
                      websiteUrl: artistWeb,
                      generateStandardMediaPack: true,
                    })
                    setArtisticName("")
                    setLegalName("")
                    setArtistBio("")
                    setFeedback(
                      `Intérprete «${created.artisticName}» creado con su Pack Multimedia de 12 salidas (.mp4, portadas, miniatura y flyers).`,
                    )
                  })
                }}
              >
                <div>
                  <Label>Nombre artístico *</Label>
                  <Input
                    required
                    value={artisticName}
                    onChange={(e) => setArtisticName(e.target.value)}
                    placeholder="Ej. Rocío «La Perla de Lavapiés»"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Disciplina</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value as ArtistDiscipline)}
                    >
                      {Object.entries(ARTIST_DISCIPLINE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Caché base (€)</Label>
                    <Input
                      type="number"
                      value={baseCacheEur}
                      onChange={(e) => setBaseCacheEur(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Palos y estilos (separados por comas)</Label>
                  <Input
                    value={stylesText}
                    onChange={(e) => setStylesText(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Guitarrista titular habitual</Label>
                    <Input
                      value={leadGuitarist}
                      onChange={(e) => setLeadGuitarist(e.target.value)}
                      placeholder="Ej. Diego del Morón"
                    />
                  </div>
                  <div>
                    <Label>Otros guitarristas habituales</Label>
                    <Input
                      value={altGuitarists}
                      onChange={(e) => setAltGuitarists(e.target.value)}
                      placeholder="Paco Heredia, Curro..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="bringsGroup"
                    type="checkbox"
                    checked={bringsGroup}
                    onChange={(e) => setBringsGroup(e.target.checked)}
                  />
                  <Label htmlFor="bringsGroup">Suele llevar a su propio grupo / cuadro</Label>
                </div>
                <div>
                  <Label>Formación del grupo</Label>
                  <Input
                    value={groupFormation}
                    onChange={(e) => setGroupFormation(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Correo electrónico</Label>
                    <Input
                      type="email"
                      value={artistEmail}
                      onChange={(e) => setArtistEmail(e.target.value)}
                      placeholder="artista@dominio.es"
                    />
                  </div>
                  <div>
                    <Label>Teléfono / WhatsApp</Label>
                    <Input
                      value={artistPhone}
                      onChange={(e) => setArtistPhone(e.target.value)}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                </div>
                <div>
                  <Label>Web oficial (opcional)</Label>
                  <Input
                    value={artistWeb}
                    onChange={(e) => setArtistWeb(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Biografía y trayectoria</Label>
                  <Textarea
                    rows={3}
                    value={artistBio}
                    onChange={(e) => setArtistBio(e.target.value)}
                    placeholder="Premios, festivales, estilo de cante/baile/toque..."
                  />
                </div>
                <Button type="submit" disabled={isPending} className="w-full">
                  <Plus className="mr-1.5 size-4" />
                  Guardar Intérprete + Pack de 12 Piezas
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PACK MULTIMEDIA DE 9 VÍDEOS .MP4, PORTADAS, MINIATURA, FLYERS Y MULTIMEDIA ABIERTO / YOUTUBE */}
      {activeTab === "multimedia" && (
        <div className="space-y-6">
          {/* Tabla oficial solicitada: "2. Para qué sirve cada salida" */}
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">
                  Guía Oficial del Pack Multimedia para Intérpretes y Conciertos: «2. Para qué sirve cada salida» (+ Multimedia Abierto y YouTube)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cada intérprete y cada concierto/evento dispone de las 12 salidas estándar y además admite cualquier otro formato multimedia abierto (vídeos de conciertos en YouTube, entrevistas, audios, reportajes o prensa).
                </p>
              </div>
              <Badge variant="default">12 Estándar + Abierto a Otros y YouTube</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2.5 font-semibold">Pieza</th>
                    <th className="p-2.5 font-semibold">Formato / Dimensiones</th>
                    <th className="p-2.5 font-semibold">Úsala para</th>
                    <th className="p-2.5 font-semibold">Fase de difusión</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {FLAMENCO_MEDIA_PIECES.map((piece) => (
                    <tr key={piece.code} className="hover:bg-muted/30">
                      <td className="p-2.5 font-medium">{piece.label}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {piece.formatLabel} · {piece.dimensions}
                        {piece.maxSizeMb ? ` (máx. ${piece.maxSizeMb} MB)` : ""}
                      </td>
                      <td className="p-2.5">{piece.recommendedUse}</td>
                      <td className="p-2.5">
                        <Badge variant="outline">
                          {piece.releasePhase === "tres_semanas_antes"
                            ? "3 semanas antes"
                            : piece.releasePhase === "semana_antes"
                              ? "1 semana antes"
                              : "Referencia en Web"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary/5">
                    <td className="p-2.5 font-bold text-primary">
                      + Multimedia Abierto / Vídeos YouTube / Otros
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      YouTube, Vimeo, MP4 en plataforma, Audio, Galería, Prensa
                    </td>
                    <td className="p-2.5">
                      Grabaciones en directo de conciertos (en nuestra plataforma o en YouTube), entrevistas públicas, documentales, reportajes o cualquier pieza especial.
                    </td>
                    <td className="p-2.5">
                      <Badge>Abierto / Permanente</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-950 dark:text-amber-200">
              💡 {MEDIA_COMBINATION_GUIDE}
            </div>
          </div>

          {/* Selector de Intérprete o Concierto/Evento para ver sus piezas */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
                <div className="flex-1">
                  <Label>Filtrar piezas por Intérprete</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedArtistIdForMedia}
                    onChange={(e) => {
                      setSelectedArtistIdForMedia(e.target.value)
                      setSelectedConcertIdForMedia("")
                    }}
                  >
                    <option value="">Todos los intérpretes</option>
                    {snapshot.artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.artisticName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Label>O filtrar por Concierto / Evento</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedConcertIdForMedia}
                    onChange={(e) => {
                      setSelectedConcertIdForMedia(e.target.value)
                      if (e.target.value) setSelectedArtistIdForMedia("")
                    }}
                  >
                    <option value="">Todos los conciertos y eventos</option>
                    {snapshot.concerts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                {canManage && selectedArtistIdForMedia ? (
                  <div className="pt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        const art = snapshot.artists.find((a) => a.id === selectedArtistIdForMedia)
                        if (!art) return
                        startTransition(async () => {
                          const res = await generateFullMediaPackServerAction({
                            artistId: art.id,
                            subjectName: art.artisticName,
                          })
                          setFeedback(
                            `Se han generado ${res.countCreated} piezas multimedia estándar para ${art.artisticName}.`,
                          )
                        })
                      }}
                    >
                      <Layers className="mr-1.5 size-4" />
                      Regenerar las 12 piezas estándar
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredMediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex flex-col justify-between rounded-xl border bg-card p-3.5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                          {asset.sourcePlatform === "youtube" || asset.fileUrl.endsWith(".mp4") ? (
                            <Film className="size-4 text-primary" />
                          ) : (
                            <ImageIcon className="size-4 text-primary" />
                          )}
                          {asset.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {asset.sourcePlatform === "youtube"
                            ? "YouTube"
                            : asset.customPieceLabel || asset.formatLabel}
                        </Badge>
                      </div>
                      {asset.youtubeVideoId ? (
                        <div className="mt-2 aspect-video overflow-hidden rounded-lg border bg-black">
                          <iframe
                            className="size-full"
                            src={`https://www.youtube.com/embed/${asset.youtubeVideoId}`}
                            title={asset.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : null}
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {asset.recommendedUse}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
                      <span className="text-muted-foreground">
                        {asset.dimensions}
                        {asset.maxSizeMb ? ` · máx ${asset.maxSizeMb} MB` : ""}
                      </span>
                      <a
                        href={asset.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Abrir ({asset.sourcePlatform}) <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {canManage && (
              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <h4 className="mb-3 text-sm font-semibold">
                  Añadir Pieza Estándar, Vídeo YouTube o Multimedia Abierto
                </h4>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const pieceMeta = FLAMENCO_MEDIA_PIECES.find((p) => p.code === pieceCode)
                    const targetArtist = snapshot.artists.find(
                      (a) => a.id === selectedArtistIdForMedia,
                    )
                    startTransition(async () => {
                      await createMediaAssetAction({
                        artistId: selectedArtistIdForMedia || snapshot.artists[0]?.id,
                        concertId: selectedConcertIdForMedia || null,
                        pieceCode,
                        customPieceLabel:
                          pieceCode === "custom_otro"
                            ? customPieceLabel || "Multimedia Especial"
                            : null,
                        sourcePlatform,
                        title:
                          customTitle.trim() ||
                          `${targetArtist?.artisticName ?? "Artista"} · ${pieceMeta?.label ?? (customPieceLabel || "Vídeo / Multimedia")}`,
                        formatLabel:
                          pieceMeta?.formatLabel ??
                          (sourcePlatform === "youtube" ? "YouTube HD" : "Multimedia Abierto"),
                        durationSeconds: pieceMeta?.durationSeconds ?? null,
                        maxSizeMb: pieceMeta?.maxSizeMb ?? null,
                        dimensions: pieceMeta?.dimensions ?? "1920×1080",
                        recommendedUse:
                          customUse.trim() ||
                          pieceMeta?.recommendedUse ||
                          "Vídeo de concierto / entrevista / contenido especial para web y redes.",
                        fileUrl:
                          pieceUrl ||
                          `https://cdn.soniqueteflamenco.com/media/custom/${pieceCode}.mp4`,
                        releasePhase: pieceMeta?.releasePhase ?? "referencia_web",
                      })
                      setPieceUrl("")
                      setCustomTitle("")
                      setCustomPieceLabel("")
                      setCustomUse("")
                      setFeedback("Pieza multimedia añadida correctamente.")
                    })
                  }}
                >
                  <div>
                    <Label>Tipo de salida (12 estándar o Abierto a otros)</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={pieceCode}
                      onChange={(e) => setPieceCode(e.target.value)}
                    >
                      {FLAMENCO_MEDIA_PIECES.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.label} ({p.dimensions})
                        </option>
                      ))}
                      <option value="custom_otro">
                        ★ Otro Multimedia Adicional (Abierto: Concierto YouTube, Entrevista, Audio, Prensa...)
                      </option>
                    </select>
                  </div>

                  {pieceCode === "custom_otro" && (
                    <div>
                      <Label>Etiqueta del formato libre *</Label>
                      <Input
                        required
                        value={customPieceLabel}
                        onChange={(e) => setCustomPieceLabel(e.target.value)}
                        placeholder="Ej. Directo completo YouTube / Entrevista TV / Crítica prensa"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Plataforma de origen</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={sourcePlatform}
                      onChange={(e) => setSourcePlatform(e.target.value as MediaSourcePlatform)}
                    >
                      {Object.entries(MEDIA_SOURCE_PLATFORM_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Título de la pieza (opcional)</Label>
                    <Input
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Ej. Directo en Sala Villanos · Soleá por Bulerías"
                    />
                  </div>

                  <div>
                    <Label>URL del archivo (.mp4, .jpg, .pdf) o enlace de YouTube *</Label>
                    <Input
                      required
                      value={pieceUrl}
                      onChange={(e) => setPieceUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... o https://cdn.../video.mp4"
                    />
                  </div>

                  <div>
                    <Label>Para qué sirve / Notas de difusión (opcional)</Label>
                    <Input
                      value={customUse}
                      onChange={(e) => setCustomUse(e.target.value)}
                      placeholder="Ej. Mostrar en la ficha del artista y en la landing del evento"
                    />
                  </div>

                  <Button type="submit" disabled={isPending} className="w-full">
                    <Plus className="mr-1.5 size-4" />
                    Adjuntar pieza multimedia / vídeo YouTube
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SALAS DE FLAMENCO, SALAS DE CONCIERTOS, ATENEOS Y ADMINISTRACIÓN */}
      {activeTab === "salas" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-base font-semibold">
              Directorio de Salas de Flamenco, Salas de Conciertos, Ateneos y Administración ({snapshot.venues.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {snapshot.venues.map((v) => (
                <div key={v.id} className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold">{v.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {v.city} ({v.province}) · Aforo: {v.capacity} butacas
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {VENUE_KIND_LABELS[v.kind as VenueKind] ?? v.kind}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div>
                      <span className="font-semibold">Programador/a: </span>
                      {v.programmerName || "Dirección de programación"}
                    </div>
                    <div>
                      <span className="font-semibold">Presupuesto orientativo: </span>
                      {v.typicalBudgetEur} €
                    </div>
                    {v.email ? <div>✉️ {v.email}</div> : null}
                    {v.phone ? <div>📞 {v.phone}</div> : null}
                    {v.websiteUrl ? (
                      <div>
                        🌐{" "}
                        <a
                          href={v.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {v.websiteUrl}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canManage && (
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h3 className="mb-3 text-base font-semibold">
                Añadir Sala, Ateneo o Administración
              </h3>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  startTransition(async () => {
                    const created = await createVenueAction({
                      name: venueName,
                      kind: venueKind,
                      city: venueCity,
                      province: venueCity,
                      capacity: Number(venueCapacity) || 180,
                      typicalBudgetEur: Number(venueBudget) || 2200,
                      programmerName: venueProgrammer,
                      email: venueEmail,
                      phone: venuePhone,
                      websiteUrl: venueWeb,
                    })
                    setVenueName("")
                    setVenueProgrammer("")
                    setVenueEmail("")
                    setFeedback(
                      `Sala «${created.name}» añadida y sincronizada en Contactos para campañas de Envíos.`,
                    )
                  })
                }}
              >
                <div>
                  <Label>Nombre de la sala, ateneo o ayuntamiento *</Label>
                  <Input
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Ej. Ateneo de Madrid / Sala Villanos"
                  />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={venueKind}
                    onChange={(e) => setVenueKind(e.target.value as VenueKind)}
                  >
                    {Object.entries(VENUE_KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Ciudad</Label>
                    <Input
                      value={venueCity}
                      onChange={(e) => setVenueCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Aforo</Label>
                    <Input
                      type="number"
                      value={venueCapacity}
                      onChange={(e) => setVenueCapacity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Caché hab. (€)</Label>
                    <Input
                      type="number"
                      value={venueBudget}
                      onChange={(e) => setVenueBudget(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Responsable de programación</Label>
                  <Input
                    value={venueProgrammer}
                    onChange={(e) => setVenueProgrammer(e.target.value)}
                    placeholder="Nombre del programador o concejalía"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Email contratación</Label>
                    <Input
                      type="email"
                      value={venueEmail}
                      onChange={(e) => setVenueEmail(e.target.value)}
                      placeholder="programacion@sala.es"
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={venuePhone}
                      onChange={(e) => setVenuePhone(e.target.value)}
                      placeholder="+34 91..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Página web</Label>
                  <Input
                    value={venueWeb}
                    onChange={(e) => setVenueWeb(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <Button type="submit" disabled={isPending} className="w-full">
                  <Plus className="mr-1.5 size-4" />
                  Guardar Sala + Crear Contacto
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONCIERTOS, OTROS EVENTOS (VIAJES, CONFERENCIAS, ENTREVISTAS), MÍNIMO ASISTENTES Y RESERVAS PROVISIONALES */}
      {activeTab === "conciertos" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                Conciertos, Viajes Flamencos, Conferencias y Entrevistas Públicas ({snapshot.concerts.length})
              </h3>
              {snapshot.concerts.map((c) => {
                const art = snapshot.artists.find((a) => a.id === c.artistId)
                const ven = snapshot.venues.find((v) => v.id === c.venueId)
                const mediaCount = snapshot.mediaAssets.filter(
                  (m) => m.concertId === c.id,
                ).length
                const eventProvBookings = snapshot.provisionalBookings.filter(
                  (b) => b.concertId === c.id,
                )
                const belowMin =
                  c.cancelIfBelowMinAttendees && c.currentAttendees < c.minAttendees

                return (
                  <div key={c.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {EVENT_KIND_LABELS[c.eventKind as EventKind] ?? c.eventKind}
                          </Badge>
                          <h4 className="font-bold">{c.title}</h4>
                          <Badge>{CONCERT_STATUS_LABELS[c.status] ?? c.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Protagonista / Intérprete: <strong>{art?.artisticName ?? "—"}</strong> ·{" "}
                          {c.dateAndPlaceTbd ? (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              ⏳ Fecha y lugar aún por determinar (Admite reservas provisionales)
                            </span>
                          ) : (
                            <>
                              Lugar: <strong>{ven?.name ?? "Por confirmar"}</strong> · Fecha:{" "}
                              {new Date(c.startsAt).toLocaleString("es-ES")}
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedConcertIdForMedia(c.id)
                          setSelectedArtistIdForMedia("")
                          setActiveTab("multimedia")
                        }}
                      >
                        <Film className="mr-1.5 size-4" />
                        Multimedia del Evento ({mediaCount})
                      </Button>
                    </div>

                    {/* Bloques de reglas de negocio pedidas: Mínimo de asistentes y Reservas provisionales sin fecha/lugar */}
                    <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Users className="size-3.5 text-primary" />
                          Regla de Aforo Mínimo:
                        </div>
                        {c.cancelIfBelowMinAttendees ? (
                          <div className="space-y-1">
                            <span
                              className={
                                belowMin
                                  ? "font-medium text-amber-700 dark:text-amber-300"
                                  : "font-medium text-emerald-700 dark:text-emerald-300"
                              }
                            >
                              Si no llega a {c.minAttendees} asistentes se cancela · Actual:{" "}
                              {c.currentAttendees} asistentes
                            </span>
                            {canManage && c.status !== "cancelado" ? (
                              <div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  disabled={isPending}
                                  onClick={() => {
                                    startTransition(async () => {
                                      const res = await evaluateMinAttendeesAction(c.id)
                                      setFeedback(res.message)
                                    })
                                  }}
                                >
                                  <AlertTriangle className="mr-1 size-3" />
                                  Comprobar mínimo ({c.currentAttendees}/{c.minAttendees})
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Sin cancelación por mínimo de asistentes (Actual: {c.currentAttendees})
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <BellRing className="size-3.5 text-primary" />
                          Reservas Provisionales y Aviso Automático:
                        </div>
                        <div>
                          {c.provisionalBookingsOpen || c.dateAndPlaceTbd ? (
                            <span className="font-medium text-sky-700 dark:text-sky-300">
                              Admite reservas provisionales ({eventProvBookings.length} registradas) ·{" "}
                              {c.autoNotifyToConfirm
                                ? "Aviso automático ACTIVO para confirmar"
                                : "Aviso manual"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Fecha y lugar cerrados ({eventProvBookings.length} reservas provisionales)
                            </span>
                          )}
                        </div>
                        {canManage && eventProvBookings.length > 0 ? (
                          <div>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  const res = await notifyProvisionalBookingsAction({
                                    concertId: c.id,
                                  })
                                  setFeedback(
                                    `Se ha enviado el aviso automático de confirmación (SMS Zadarma y estado actualizado) a ${res.notifiedCount} reservas provisionales de «${c.title}».`,
                                  )
                                })
                              }}
                            >
                              <BellRing className="mr-1 size-3" />
                              Enviar aviso automático para que confirmen ({eventProvBookings.length})
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {eventProvBookings.length > 0 && (
                      <div className="rounded-lg border bg-background p-2.5 text-xs">
                        <div className="mb-1.5 font-semibold">
                          Reservas Provisionales de este Evento ({eventProvBookings.length}):
                        </div>
                        <div className="space-y-1.5">
                          {eventProvBookings.map((b) => (
                            <div
                              key={b.id}
                              className="flex flex-wrap items-center justify-between gap-2 border-t pt-1.5"
                            >
                              <span>
                                <strong>{b.attendeeName}</strong> ({b.seats} plazas) ·{" "}
                                {b.attendeeEmail || b.attendeePhone || "Sin contacto"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant={b.status === "confirmada" ? "default" : "outline"}
                                >
                                  {b.status}
                                </Badge>
                                {canManage && b.status !== "confirmada" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[11px]"
                                    onClick={() => {
                                      startTransition(async () => {
                                        await confirmProvisionalBookingAction(b.id)
                                        setFeedback(
                                          `Reserva de ${b.attendeeName} marcada como confirmada.`,
                                        )
                                      })
                                    }}
                                  >
                                    Confirmar plaza
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <span>💶 Presupuesto/Caché: {c.agreedCacheEur} €</span>
                      <span>🎟 Entrada/Inscripción: {c.ticketPriceEur} €</span>
                      {c.guitaristName ? <span>🎸 Guitarra: {c.guitaristName}</span> : null}
                      {c.calcomMeetingUrl ? (
                        <a
                          href={c.calcomMeetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary underline"
                        >
                          Sala Cal.com (Producción) <ExternalLink className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                Contratos Artísticos y Enlaces de Pago Stripe/Bizum ({snapshot.contracts.length})
              </h3>
              {snapshot.contracts.map((cnt) => {
                const art = snapshot.artists.find((a) => a.id === cnt.artistId)
                const ven = snapshot.venues.find((v) => v.id === cnt.venueId)
                return (
                  <div key={cnt.id} className="rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-primary">
                          {cnt.code}
                        </span>
                        <h4 className="font-semibold">
                          {art?.artisticName ?? "Intérprete"} → {ven?.name ?? "Promotor"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {CONTRACT_TYPE_LABELS[cnt.contractType] ?? cnt.contractType} · Importe:{" "}
                          <strong>{cnt.totalAmountEur} €</strong> (Señal {cnt.advancePercent}% · Comisión agencia {cnt.agencyCommissionPercent}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {CONTRACT_STATUS_LABELS[cnt.status] ?? cnt.status}
                        </Badge>
                        {cnt.stripePaymentLinkUrl ? (
                          <a
                            href={cnt.stripePaymentLinkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
                          >
                            Link Stripe/Bizum <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {canManage && (
            <div className="space-y-6">
              {/* Formulario Crear Concierto u Otro Evento (Viaje, Conferencia, Entrevista, etc.) */}
              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <h4 className="mb-3 text-sm font-semibold">
                  Crear Concierto, Viaje, Conferencia o Entrevista Pública
                </h4>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    startTransition(async () => {
                      const created = await createConcertAction({
                        title: concertTitle,
                        eventKind,
                        artistId: concertArtistId,
                        venueId: dateAndPlaceTbd ? null : concertVenueId,
                        startsAtIso: dateAndPlaceTbd
                          ? null
                          : new Date(concertDate).toISOString(),
                        dateAndPlaceTbd,
                        provisionalBookingsOpen,
                        autoNotifyToConfirm,
                        cancelIfBelowMinAttendees,
                        minAttendees: Number(minAttendees) || 0,
                        currentAttendees: Number(currentAttendees) || 0,
                        agreedCacheEur: Number(concertCache) || 2200,
                        guitaristName: concertGuitarist,
                        bringsGroup: true,
                        createCalcomMeeting: true,
                        generateStandardMediaPack: true,
                      })
                      setConcertTitle("")
                      setProvEventId(created.id)
                      setFeedback(
                        `Evento «${created.title}» (${EVENT_KIND_LABELS[eventKind]}) creado correctamente.`,
                      )
                    })
                  }}
                >
                  <div>
                    <Label>Tipo de Evento *</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={eventKind}
                      onChange={(e) => setEventKind(e.target.value as EventKind)}
                    >
                      {Object.entries(EVENT_KIND_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Título del concierto, viaje, conferencia o entrevista *</Label>
                    <Input
                      required
                      value={concertTitle}
                      onChange={(e) => setConcertTitle(e.target.value)}
                      placeholder="Ej. Viaje al Jerez Flamenco / Conferencia Ilustrada de Cante"
                    />
                  </div>
                  <div>
                    <Label>Intérprete / Ponente principal</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={concertArtistId}
                      onChange={(e) => setConcertArtistId(e.target.value)}
                    >
                      {snapshot.artists.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.artisticName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Propiedad 1: No se sabe aún la fecha ni el lugar pero se admiten reservas provisionales */}
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
                    <label className="flex items-start gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={dateAndPlaceTbd}
                        onChange={(e) => {
                          setDateAndPlaceTbd(e.target.checked)
                          if (e.target.checked) setProvisionalBookingsOpen(true)
                        }}
                      />
                      <span>
                        No se sabe aún la fecha ni el lugar, pero se admiten reservas provisionales
                      </span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={provisionalBookingsOpen}
                        onChange={(e) => setProvisionalBookingsOpen(e.target.checked)}
                      />
                      <span>Admitir reservas provisionales de plazas</span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={autoNotifyToConfirm}
                        onChange={(e) => setAutoNotifyToConfirm(e.target.checked)}
                      />
                      <span>
                        Enviar aviso automático a los inscritos para que confirmen su reserva cuando se fije fecha y lugar
                      </span>
                    </label>
                  </div>

                  {!dateAndPlaceTbd && (
                    <>
                      <div>
                        <Label>Sala / Ateneo / Lugar</Label>
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={concertVenueId}
                          onChange={(e) => setConcertVenueId(e.target.value)}
                        >
                          {snapshot.venues.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.city})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Fecha y hora</Label>
                        <Input
                          type="datetime-local"
                          value={concertDate}
                          onChange={(e) => setConcertDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Propiedad 2: Si no se llega al número de asistentes se cancela */}
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
                    <label className="flex items-start gap-2 font-medium">
                      <input
                        type="checkbox"
                        checked={cancelIfBelowMinAttendees}
                        onChange={(e) => setCancelIfBelowMinAttendees(e.target.checked)}
                      />
                      <span>
                        Si no se llega al número mínimo de asistentes se cancela el evento
                      </span>
                    </label>
                    {cancelIfBelowMinAttendees && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <Label className="text-xs">Mínimo requerido</Label>
                          <Input
                            type="number"
                            value={minAttendees}
                            onChange={(e) => setMinAttendees(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Asistentes actuales</Label>
                          <Input
                            type="number"
                            value={currentAttendees}
                            onChange={(e) => setCurrentAttendees(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Caché / Presupuesto (€)</Label>
                      <Input
                        type="number"
                        value={concertCache}
                        onChange={(e) => setConcertCache(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Guitarrista / Acompañante</Label>
                      <Input
                        value={concertGuitarist}
                        onChange={(e) => setConcertGuitarist(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full">
                    <CalendarCheck2 className="mr-1.5 size-4" />
                    Guardar Evento + Sala Cal.com
                  </Button>
                </form>
              </div>

              {/* Formulario Registrar Reserva Provisional en un Evento */}
              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <h4 className="mb-2 text-sm font-semibold">
                  Registrar Reserva Provisional (para Eventos sin fecha/lugar o en preinscripción)
                </h4>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    startTransition(async () => {
                      const res = await createProvisionalBookingAction({
                        concertId: provEventId || snapshot.concerts[0]?.id,
                        attendeeName: provName,
                        attendeeEmail: provEmail,
                        attendeePhone: provPhone,
                        seats: Number(provSeats) || 1,
                      })
                      setProvName("")
                      setProvEmail("")
                      setProvPhone("")
                      setFeedback(
                        `Reserva provisional registrada (${res.booking.seats} plazas). Total asistentes ahora: ${res.currentAttendees}.`,
                      )
                    })
                  }}
                >
                  <div>
                    <Label>Evento</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={provEventId}
                      onChange={(e) => setProvEventId(e.target.value)}
                    >
                      {snapshot.concerts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label>Nombre del interesado *</Label>
                      <Input
                        required
                        value={provName}
                        onChange={(e) => setProvName(e.target.value)}
                        placeholder="Ej. Ana Belén Gómez"
                      />
                    </div>
                    <div>
                      <Label>Plazas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={provSeats}
                        onChange={(e) => setProvSeats(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Email (para aviso)</Label>
                      <Input
                        type="email"
                        value={provEmail}
                        onChange={(e) => setProvEmail(e.target.value)}
                        placeholder="cliente@correo.es"
                      />
                    </div>
                    <div>
                      <Label>Móvil (para SMS Zadarma)</Label>
                      <Input
                        value={provPhone}
                        onChange={(e) => setProvPhone(e.target.value)}
                        placeholder="+34 600..."
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="secondary" disabled={isPending} className="w-full">
                    <Plus className="mr-1.5 size-4" />
                    Anotar Reserva Provisional
                  </Button>
                </form>
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <h4 className="mb-3 text-sm font-semibold">
                  Emitir Contrato + Enlace de Pago Stripe/Bizum
                </h4>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    startTransition(async () => {
                      const created = await createContractAction({
                        code: contractCode,
                        artistId: contractArtistId,
                        venueId: contractVenueId,
                        totalAmountEur: Number(contractTotalEur) || 2500,
                        advancePercent: 50,
                        agencyCommissionPercent: 15,
                      })
                      setContractCode(`CNT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`)
                      setFeedback(
                        `Contrato ${created.code} generado con su enlace de pago Stripe/Bizum registrado en /pagos.`,
                      )
                    })
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Código contrato</Label>
                      <Input
                        value={contractCode}
                        onChange={(e) => setContractCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Importe total (€)</Label>
                      <Input
                        type="number"
                        value={contractTotalEur}
                        onChange={(e) => setContractTotalEur(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Intérprete</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={contractArtistId}
                      onChange={(e) => setContractArtistId(e.target.value)}
                    >
                      {snapshot.artists.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.artisticName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Sala contratante</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={contractVenueId}
                      onChange={(e) => setContractVenueId(e.target.value)}
                    >
                      {snapshot.venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full">
                    <FileSignature className="mr-1.5 size-4" />
                    Generar Contrato + Cobro Stripe
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SIMULADOR DE OFERTA DE CONCIERTO A SALA -> MÓDULO DE ENVÍOS */}
      {activeTab === "simulador" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-5">
            <h3 className="mb-1 text-base font-semibold">
              Simulador de Oferta de Concierto a Salas
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Configura la propuesta artística (intérprete, guitarrista, grupo, caché y pack de vídeos .mp4) y genera automáticamente la campaña en el módulo de <strong>Envíos</strong> (WhatsApp, Telegram y Correo).
            </p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  const res = await simulateConcertOfferAction({
                    title: offerTitle,
                    artistId: offerArtistId,
                    venueId: offerVenueId || null,
                    targetVenueKind: offerTargetKind,
                    proposedDateText: offerDateText,
                    proposedCacheEur: Number(offerCacheEur) || 2200,
                    includesGroup: offerIncludesGroup,
                    guitaristName: offerGuitarist,
                    channels: ["whatsapp", "telegram", "email"],
                    createCampaignInEnvios: offerPushToEnvios,
                  })
                  setFeedback(
                    res.campaignId
                      ? `Oferta simulada y campaña creada automáticamente en el módulo de Envíos (ID: ${res.campaignId.slice(0, 8)}).`
                      : "Simulación de oferta generada correctamente.",
                  )
                })
              }}
            >
              <div>
                <Label>Título de la oferta / gira *</Label>
                <Input
                  required
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Intérprete a promocionar</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={offerArtistId}
                    onChange={(e) => setOfferArtistId(e.target.value)}
                  >
                    {snapshot.artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.artisticName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tipo de salas destinatarias</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={offerTargetKind}
                    onChange={(e) => setOfferTargetKind(e.target.value as VenueKind)}
                  >
                    {Object.entries(VENUE_KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Sala específica (o dejar para todo el segmento)</Label>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={offerVenueId}
                  onChange={(e) => setOfferVenueId(e.target.value)}
                >
                  <option value="">Todas las salas de la categoría seleccionada</option>
                  {snapshot.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.city})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Fechas propuestas</Label>
                  <Input
                    value={offerDateText}
                    onChange={(e) => setOfferDateText(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Caché ofertado (€)</Label>
                  <Input
                    type="number"
                    value={offerCacheEur}
                    onChange={(e) => setOfferCacheEur(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Guitarrista en la oferta</Label>
                <Input
                  value={offerGuitarist}
                  onChange={(e) => setOfferGuitarist(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="offerGroup"
                  type="checkbox"
                  checked={offerIncludesGroup}
                  onChange={(e) => setOfferIncludesGroup(e.target.checked)}
                />
                <Label htmlFor="offerGroup">Incluir cuadro flamenco completo en la oferta</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="offerEnvios"
                  type="checkbox"
                  checked={offerPushToEnvios}
                  onChange={(e) => setOfferPushToEnvios(e.target.checked)}
                />
                <Label htmlFor="offerEnvios">
                  Generar automáticamente campaña programada en el módulo «Envíos»
                </Label>
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                <Send className="mr-1.5 size-4" />
                Simular Oferta y Pasar a Envíos
              </Button>
            </form>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                Ofertas Simuladas y Conectadas con Envíos ({snapshot.concertOffers.length})
              </h3>
              <Button asChild variant="outline" size="sm">
                <Link href="/envios">
                  Ir al módulo de Envíos <ExternalLink className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </div>
            {snapshot.concertOffers.map((off) => (
              <div key={off.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold">{off.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Fechas: {off.proposedDateText} · Caché: {off.proposedCacheEur} € · Guitarra:{" "}
                      {off.guitaristName || "Titular"}
                    </p>
                  </div>
                  <Badge variant={off.campaignId ? "default" : "secondary"}>
                    {off.campaignId ? "Pasada a Envíos (/envios)" : "Simulación lista"}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Vista previa WhatsApp (con pieza 4 · 6 MB y Reel 7):
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs">
                      {off.whatsappPreview}
                    </pre>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="mb-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                      Vista previa Correo y Bot Telegram (@soniqueteflamencoMadrid):
                    </div>
                    <div className="mb-1 text-xs font-medium">{off.emailSubject}</div>
                    <pre className="whitespace-pre-wrap font-sans text-xs">
                      {off.emailPreview}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: CAPTACIÓN DE CONTACTOS DE SALAS Y ARTISTAS DESDE PÁGINAS WEB */}
      {activeTab === "captacion_web" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <h3 className="mb-1 text-base font-semibold">
              Captador Automático desde Páginas Web de Salas y de Artistas
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Introduce la dirección web de una sala de flamenco, sala de conciertos, ateneo o la web de un intérprete. El sistema analiza la web, extrae su nombre, correo electrónico y teléfono, y crea automáticamente el contacto etiquetado para enviarle ofertas desde <strong>Envíos</strong>.
            </p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  const res = await scrapeWebEntityAction({
                    targetType: scrapeTargetType,
                    websiteUrl: scrapeUrl,
                    fallbackName: scrapeName || undefined,
                    fallbackCity: scrapeCity,
                    venueKind: scrapeVenueKind,
                  })
                  setScrapeName("")
                  setFeedback(
                    res.targetType === "venue"
                      ? `Sala «${res.name}» (${res.email}) extraída desde ${res.websiteUrl} y añadida a Salas y Contactos.`
                      : `Intérprete «${res.name}» (${res.email}) extraído desde ${res.websiteUrl} con su Pack Multimedia y añadido a Contactos para ofrecerle Servicios Digitales.`,
                  )
                })
              }}
            >
              <div>
                <Label>¿Qué quieres captar desde la web?</Label>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={scrapeTargetType}
                  onChange={(e) => setScrapeTargetType(e.target.value as "venue" | "artist")}
                >
                  <option value="venue">
                    Sala de flamenco / Sala de conciertos / Ateneo (para enviarles ofertas de conciertos)
                  </option>
                  <option value="artist">
                    Intérprete / Artista con web propia (para enviarle oferta de Servicios Digitales: Landing + IA + Redes)
                  </option>
                </select>
              </div>
              <div>
                <Label>URL de la página web *</Label>
                <Input
                  required
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="https://www.ateneodemadrid.com o https://webdelartista.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nombre (opcional, se detecta de la web)</Label>
                  <Input
                    value={scrapeName}
                    onChange={(e) => setScrapeName(e.target.value)}
                    placeholder="Autodetectar del título web"
                  />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input
                    value={scrapeCity}
                    onChange={(e) => setScrapeCity(e.target.value)}
                  />
                </div>
              </div>
              {scrapeTargetType === "venue" && (
                <div>
                  <Label>Tipo de entidad</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={scrapeVenueKind}
                    onChange={(e) => setScrapeVenueKind(e.target.value as VenueKind)}
                  >
                    {Object.entries(VENUE_KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button type="submit" disabled={isPending} className="w-full">
                <Globe className="mr-1.5 size-4" />
                Analizar Web y Generar Ficha + Contacto para Ofertas
              </Button>
            </form>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
            <h3 className="text-base font-semibold">
              Últimas Salas y Artistas Captados desde Web
            </h3>
            <div className="space-y-2">
              {snapshot.venues
                .filter((v) => v.sourceWebExtracted)
                .map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold">{v.name}</div>
                      <div className="text-muted-foreground">
                        {v.email} · {v.websiteUrl}
                      </div>
                    </div>
                    <Badge variant="secondary">Sala Web</Badge>
                  </div>
                ))}
              {snapshot.artists
                .filter((a) => a.sourceWebExtracted)
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold">{a.artisticName}</div>
                      <div className="text-muted-foreground">
                        {a.email} · {a.websiteUrl}
                      </div>
                    </div>
                    <Badge>Artista Web</Badge>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SERVICIOS DIGITALES PARA ARTISTAS (LANDING + AGENTES + INSTAGRAM + WHATSAPP + YOUTUBE + TELEGRAM) */}
      {activeTab === "servicios_artistas" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-base font-semibold">
              Packs de Servicios Digitales para Artistas (Landing + Agentes IA + Instagram + WhatsApp + YouTube + Telegram + 9 Vídeos)
            </h3>
            <div className="grid gap-3">
              {snapshot.digitalServices.map((srv) => {
                const art = snapshot.artists.find((a) => a.id === srv.artistId)
                return (
                  <div key={srv.id} className="rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold">
                          {srv.packName} · <span className="text-primary">{art?.artisticName}</span>
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Alta: {srv.setupFeeEur} € + {srv.monthlyFeeEur} €/mes · Dominio:{" "}
                          <strong>{srv.landingDomain || "soniqueteflamenco.com"}</strong>
                        </p>
                      </div>
                      <Badge>{srv.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {srv.includesLanding && <Badge variant="outline">🌐 Landing Artística</Badge>}
                      {srv.includesAiAgent && <Badge variant="outline">🤖 Agente IA Contratación</Badge>}
                      {srv.includesWhatsappChannel && <Badge variant="outline">💬 WhatsApp Oficial</Badge>}
                      {srv.includesTelegramBot && (
                        <Badge variant="outline">✈️ Telegram ({srv.telegramBotUsername})</Badge>
                      )}
                      {srv.includesInstagramSetup && <Badge variant="outline">📸 Instagram Reels</Badge>}
                      {srv.includesYoutubeChannel && <Badge variant="outline">▶️ Canal YouTube</Badge>}
                      {srv.includesNineVideosPack && <Badge variant="outline">🎬 Pack 9 Vídeos .MP4</Badge>}
                    </div>
                    {srv.stripePaymentLinkUrl ? (
                      <div className="mt-3">
                        <a
                          href={srv.stripePaymentLinkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline"
                        >
                          Enlace de cobro Stripe / Bizum del Pack <ExternalLink className="size-3" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {canManage && (
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h4 className="mb-3 text-sm font-semibold">
                Contratar / Ofertar Pack Digital a un Intérprete
              </h4>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  const preset =
                    snapshot.digitalPackPresets[servicePresetIdx] ??
                    snapshot.digitalPackPresets[0]
                  startTransition(async () => {
                    const created = await createArtistDigitalServiceAction({
                      artistId: serviceArtistId,
                      packName: preset.packName,
                      landingDomain: serviceDomain,
                      includesLanding: preset.includesLanding,
                      includesAiAgent: preset.includesAiAgent,
                      includesWhatsappChannel: preset.includesWhatsappChannel,
                      includesTelegramBot: preset.includesTelegramBot,
                      includesInstagramSetup: preset.includesInstagramSetup,
                      includesYoutubeChannel: preset.includesYoutubeChannel,
                      includesNineVideosPack: preset.includesNineVideosPack,
                      setupFeeEur: preset.setupFeeEur,
                      monthlyFeeEur: preset.monthlyFeeEur,
                      notes: preset.description,
                    })
                    setFeedback(
                      `Pack «${created.packName}» asignado con enlace de pago Stripe/Bizum.`,
                    )
                  })
                }}
              >
                <div>
                  <Label>Intérprete</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={serviceArtistId}
                    onChange={(e) => setServiceArtistId(e.target.value)}
                  >
                    {snapshot.artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.artisticName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Pack de Agencia</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={servicePresetIdx}
                    onChange={(e) => setServicePresetIdx(Number(e.target.value))}
                  >
                    {snapshot.digitalPackPresets.map((p, idx) => (
                      <option key={p.packName} value={idx}>
                        {p.packName} ({p.setupFeeEur} € + {p.monthlyFeeEur} €/mes)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Dominio o Landing del artista</Label>
                  <Input
                    value={serviceDomain}
                    onChange={(e) => setServiceDomain(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isPending} className="w-full">
                  <Sparkles className="mr-1.5 size-4" />
                  Activar Pack Digital + Enlace Stripe
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: REPRESENTANTES */}
      {activeTab === "representantes" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <h3 className="text-base font-semibold">
              Representantes, Managers y Apoderados ({snapshot.representatives.length})
            </h3>
            {snapshot.representatives.map((rep) => (
              <div key={rep.id} className="rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold">{rep.fullName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {rep.agencyName || "Independiente"} · Ciudad: {rep.city} · Comisión:{" "}
                      {rep.commissionPercent}%
                    </p>
                  </div>
                  <Badge variant="outline">{rep.roleKind}</Badge>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  {rep.email ? <span>✉️ {rep.email}</span> : null}
                  {rep.phone ? <span>📞 {rep.phone}</span> : null}
                </div>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h4 className="mb-3 text-sm font-semibold">Añadir Representante</h4>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  startTransition(async () => {
                    const created = await createRepresentativeAction({
                      fullName: repName,
                      agencyName: repAgency,
                      commissionPercent: Number(repCommission) || 15,
                      email: repEmail,
                      phone: repPhone,
                    })
                    setRepName("")
                    setFeedback(`Representante «${created.fullName}» registrado.`)
                  })
                }}
              >
                <div>
                  <Label>Nombre completo *</Label>
                  <Input
                    required
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="Ej. Manuel Montoya"
                  />
                </div>
                <div>
                  <Label>Agencia / Oficina</Label>
                  <Input
                    value={repAgency}
                    onChange={(e) => setRepAgency(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Comisión (%)</Label>
                  <Input
                    type="number"
                    value={repCommission}
                    onChange={(e) => setRepCommission(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={repEmail}
                    onChange={(e) => setRepEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={repPhone}
                    onChange={(e) => setRepPhone(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isPending} className="w-full">
                  <Plus className="mr-1.5 size-4" />
                  Guardar Representante
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
