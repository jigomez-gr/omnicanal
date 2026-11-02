"use client"

import {
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
  Plus,
  Send,
  Sparkles,
  UserCheck,
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
  FLAMENCO_MEDIA_PIECES,
  MEDIA_COMBINATION_GUIDE,
  VENUE_KIND_LABELS,
  type ArtistDiscipline,
  type VenueKind,
} from "@/lib/flamenco/catalog"
import {
  createArtistAction,
  createArtistDigitalServiceAction,
  createConcertAction,
  createContractAction,
  createMediaAssetAction,
  createRepresentativeAction,
  createVenueAction,
  generateFullMediaPackServerAction,
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

  // Estados formulario nueva pieza multimedia personalizada
  const [pieceCode, setPieceCode] = useState<string>(FLAMENCO_MEDIA_PIECES[0].code)
  const [pieceUrl, setPieceUrl] = useState("")

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

  // Estados formulario concierto y contrato
  const [concertTitle, setConcertTitle] = useState("")
  const [concertArtistId, setConcertArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [concertVenueId, setConcertVenueId] = useState(snapshot.venues[0]?.id ?? "")
  const [concertDate, setConcertDate] = useState("2026-11-28T21:00")
  const [concertCache, setConcertCache] = useState("2500")
  const [concertGuitarist, setConcertGuitarist] = useState("Diego del Morón")

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
  const [serviceDomain, setServiceDomain] = useState("carmenlatrianera.soniqueteconarte.com")

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
              <Badge variant="outline">soniqueteconarte.com</Badge>
              <Badge variant="secondary">@soniqueteconarteflamencoMadrid</Badge>
            </div>
            <h2 className="text-lg font-semibold">
              Centro Integral de Promoción de Intérpretes, Conciertos, Salas y Servicios Artísticos
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestiona intérpretes (biografía, estilos, grupo, guitarrista titular y pack de 9 vídeos .mp4 + portadas), salas de flamenco, salas de conciertos, ateneos y administración, simula ofertas conectadas con Envíos y capta contactos desde páginas web.
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
              <div className="text-xs text-muted-foreground">Conciertos</div>
            </div>
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-center">
              <div className="text-xl font-bold">{snapshot.mediaAssets.length}</div>
              <div className="text-xs text-muted-foreground">Piezas .MP4 / Flyers</div>
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
          { key: "interpretes", label: "1. Intérpretes", icon: Music },
          { key: "multimedia", label: "2. Pack 9 Vídeos .MP4 y Flyers", icon: Film },
          { key: "salas", label: "3. Salas, Ateneos y Admón.", icon: Building2 },
          { key: "conciertos", label: "4. Conciertos y Contratos", icon: CalendarCheck2 },
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

      {/* TAB 1: INTÉRPRETES */}
      {activeTab === "interpretes" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h3 className="text-base font-semibold">
              Catálogo de Intérpretes en Promoción ({snapshot.artists.length})
            </h3>
            <div className="grid gap-4">
              {snapshot.artists.map((artist) => {
                const mediaCount = snapshot.mediaAssets.filter(
                  (m) => m.artistId === artist.id,
                ).length
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
                        Ver Pack Multimedia ({mediaCount} piezas)
                      </Button>
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

      {/* TAB 2: PACK MULTIMEDIA DE 9 VÍDEOS .MP4, PORTADAS, MINIATURA Y FLYERS */}
      {activeTab === "multimedia" && (
        <div className="space-y-6">
          {/* Tabla oficial solicitada: "2. Para qué sirve cada salida" */}
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">
                  Guía Oficial del Pack Multimedia para Intérpretes y Conciertos: «2. Para qué sirve cada salida»
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cada intérprete y cada concierto dispone de estas 9 salidas de vídeo .mp4 más Portadas (1080×1920 y 1080×1350), Miniatura (1920×1080) y Flyers/Cartelería.
                </p>
              </div>
              <Badge variant="default">Estándar de Promoción Soniquete con Arte</Badge>
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
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-950 dark:text-amber-200">
              💡 {MEDIA_COMBINATION_GUIDE}
            </div>
          </div>

          {/* Selector de Intérprete o Concierto para ver sus piezas */}
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
                  <Label>O filtrar por Concierto</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedConcertIdForMedia}
                    onChange={(e) => {
                      setSelectedConcertIdForMedia(e.target.value)
                      if (e.target.value) setSelectedArtistIdForMedia("")
                    }}
                  >
                    <option value="">Todos los conciertos</option>
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
                            `Se han generado ${res.countCreated} piezas multimedia para ${art.artisticName}.`,
                          )
                        })
                      }}
                    >
                      <Layers className="mr-1.5 size-4" />
                      Regenerar las 12 piezas
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
                          {asset.fileUrl.endsWith(".mp4") ? (
                            <Film className="size-4 text-primary" />
                          ) : (
                            <ImageIcon className="size-4 text-primary" />
                          )}
                          {asset.title}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {asset.formatLabel}
                        </Badge>
                      </div>
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
                        Abrir archivo <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {canManage && (
              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <h4 className="mb-3 text-sm font-semibold">
                  Añadir vídeo .MP4, Portada, Miniatura o Flyer
                </h4>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const pieceMeta =
                      FLAMENCO_MEDIA_PIECES.find((p) => p.code === pieceCode) ??
                      FLAMENCO_MEDIA_PIECES[0]
                    const targetArtist = snapshot.artists.find(
                      (a) => a.id === selectedArtistIdForMedia,
                    )
                    startTransition(async () => {
                      await createMediaAssetAction({
                        artistId: selectedArtistIdForMedia || snapshot.artists[0]?.id,
                        concertId: selectedConcertIdForMedia || null,
                        pieceCode: pieceMeta.code,
                        title: `${targetArtist?.artisticName ?? "Artista"} · ${pieceMeta.label}`,
                        formatLabel: pieceMeta.formatLabel,
                        durationSeconds: pieceMeta.durationSeconds,
                        maxSizeMb: pieceMeta.maxSizeMb,
                        dimensions: pieceMeta.dimensions,
                        recommendedUse: pieceMeta.recommendedUse,
                        fileUrl:
                          pieceUrl ||
                          `https://cdn.soniqueteconarte.com/media/custom/${pieceMeta.code}.mp4`,
                        releasePhase: pieceMeta.releasePhase,
                      })
                      setPieceUrl("")
                      setFeedback(`Pieza «${pieceMeta.label}» añadida correctamente.`)
                    })
                  }}
                >
                  <div>
                    <Label>Tipo de salida (de las 12 oficiales)</Label>
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
                    </select>
                  </div>
                  <div>
                    <Label>URL del archivo (.mp4, .jpg o .pdf)</Label>
                    <Input
                      required
                      value={pieceUrl}
                      onChange={(e) => setPieceUrl(e.target.value)}
                      placeholder="https://cdn.soniqueteconarte.com/videos/reel-58s.mp4"
                    />
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full">
                    <Plus className="mr-1.5 size-4" />
                    Adjuntar pieza multimedia
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

      {/* TAB 4: CONCIERTOS Y CONTRATOS */}
      {activeTab === "conciertos" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                Conciertos y Producciones ({snapshot.concerts.length})
              </h3>
              {snapshot.concerts.map((c) => {
                const art = snapshot.artists.find((a) => a.id === c.artistId)
                const ven = snapshot.venues.find((v) => v.id === c.venueId)
                const mediaCount = snapshot.mediaAssets.filter(
                  (m) => m.concertId === c.id,
                ).length
                return (
                  <div key={c.id} className="rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold">{c.title}</h4>
                          <Badge>{CONCERT_STATUS_LABELS[c.status] ?? c.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Intérprete: <strong>{art?.artisticName ?? "—"}</strong> · Sala:{" "}
                          <strong>{ven?.name ?? "—"}</strong> · Fecha:{" "}
                          {new Date(c.startsAt).toLocaleString("es-ES")}
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
                        Vídeos y Carteles del Concierto ({mediaCount})
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                      <span>💶 Caché acordado: {c.agreedCacheEur} €</span>
                      <span>🎸 Guitarra: {c.guitaristName || "Titular"}</span>
                      <span>
                        👥 Formación: {c.bringsGroup ? c.lineupDetails || "Cuadro completo" : "Solista"}
                      </span>
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
              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <h4 className="mb-3 text-sm font-semibold">
                  Programar Concierto (+ Pack 12 Vídeos + Cita Cal.com)
                </h4>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    startTransition(async () => {
                      const created = await createConcertAction({
                        title: concertTitle,
                        artistId: concertArtistId,
                        venueId: concertVenueId,
                        startsAtIso: new Date(concertDate).toISOString(),
                        agreedCacheEur: Number(concertCache) || 2200,
                        guitaristName: concertGuitarist,
                        bringsGroup: true,
                        createCalcomMeeting: true,
                        generateStandardMediaPack: true,
                      })
                      setConcertTitle("")
                      setFeedback(
                        `Concierto «${created.title}» creado con su sala de reunión Cal.com y su Pack de 12 piezas multimedia.`,
                      )
                    })
                  }}
                >
                  <div>
                    <Label>Título del espectáculo *</Label>
                    <Input
                      required
                      value={concertTitle}
                      onChange={(e) => setConcertTitle(e.target.value)}
                      placeholder="Ej. Noche de Jondo y Compás en Madrid"
                    />
                  </div>
                  <div>
                    <Label>Intérprete</Label>
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
                  <div>
                    <Label>Sala / Ateneo / Teatro</Label>
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Fecha y hora</Label>
                      <Input
                        type="datetime-local"
                        value={concertDate}
                        onChange={(e) => setConcertDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Caché (€)</Label>
                      <Input
                        type="number"
                        value={concertCache}
                        onChange={(e) => setConcertCache(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Guitarrista asignado</Label>
                    <Input
                      value={concertGuitarist}
                      onChange={(e) => setConcertGuitarist(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full">
                    <CalendarCheck2 className="mr-1.5 size-4" />
                    Crear Concierto + Sala Cal.com
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
                      Vista previa Correo y Bot Telegram (@soniqueteconarteflamencoMadrid):
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
                          <strong>{srv.landingDomain || "soniqueteconarte.com"}</strong>
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
