"use client"

import {
  AlertTriangle,
  BellRing,
  Bot,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Globe,
  Guitar,
  Mail,
  Music,
  PlayCircle,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  UserCheck,
  Video,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { getFlamencoHubSnapshot } from "@/data/flamenco"
import {
  ARTIST_DISCIPLINE_LABELS,
  CONCERT_STATUS_LABELS,
  EVENT_KIND_LABELS,
  FLAMENCO_MEDIA_PIECES,
  MEDIA_SOURCE_PLATFORM_LABELS,
  VENUE_KIND_LABELS,
  type ArtistDiscipline,
  type EventKind,
  type MediaSourcePlatform,
  type VenueKind,
} from "@/lib/flamenco/catalog"
import {
  configureHostingerEmailAction,
  confirmProvisionalBookingAction,
  createArtistAction,
  createArtistDigitalServiceAction,
  createConcertAction,
  createMediaAssetAction,
  createProvisionalBookingAction,
  createRepresentativeAction,
  createVenueAction,
  deleteArtistAction,
  deleteArtistDigitalServiceAction,
  deleteCatalogServiceAction,
  deleteConcertAction,
  deleteMediaAssetAction,
  deleteRepresentativeAction,
  deleteVenueAction,
  evaluateEmailAutoBookingAction,
  evaluateMinAttendeesAction,
  generateFullMediaPackServerAction,
  notifyProvisionalBookingsAction,
  scrapeWebEntityAction,
  simulateConcertOfferAction,
  updateArtistAction,
  updateArtistDigitalServiceAction,
  updateConcertAction,
  updateMediaAssetAction,
  updateRepresentativeAction,
  updateVenueAction,
  updateWhatsappGatewayAction,
  upsertCatalogServiceAction,
} from "../actions"

type Snapshot = Awaited<ReturnType<typeof getFlamencoHubSnapshot>>

type MainSectionKey =
  | "a_correo"
  | "b_mantenimientos"
  | "c_conciertos"
  | "d_simulador"
  | "e_captar_web"
  | "f_servicios_artistas"

type MaintenanceSubTabKey =
  | "interpretes_videos"
  | "representantes"
  | "salas_ateneos"
  | "servicios_agenda"
  | "servicios_digitales_y_pasarela"

export function PromocionClient({
  snapshot,
  canManage,
}: {
  snapshot: Snapshot
  canManage: boolean
}) {
  const router = useRouter()
  const [mainSection, setMainSection] = useState<MainSectionKey>("b_mantenimientos")
  const [maintSubTab, setMaintSubTab] = useState<MaintenanceSubTabKey>("interpretes_videos")
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  // ─── Buscadores instantáneos de cada Maestro / Sección ───
  const [searchArtists, setSearchArtists] = useState("")
  const [searchReps, setSearchReps] = useState("")
  const [searchVenues, setSearchVenues] = useState("")
  const [searchCatalogServices, setSearchCatalogServices] = useState("")
  const [searchConcerts, setSearchConcerts] = useState("")
  const [searchDigitalServices, setSearchDigitalServices] = useState("")

  // ─── a) Opción Correo (Hostinger + Evaluador IA de Reservas por Email) ───
  const [hostingerPassword, setHostingerPassword] = useState("")
  const [emailSimSenderName, setEmailSimSenderName] = useState("María López (Peña Flamenca)")
  const [emailSimSenderEmail, setEmailSimSenderEmail] = useState("maria@penaflamenca-demo.es")
  const [emailSimSenderPhone, setEmailSimSenderPhone] = useState("+34 655 998 877")
  const [emailSimSubject, setEmailSimSubject] = useState(
    "Solicitud de reserva de 4 plazas para Noche de Cante y Compás",
  )
  const [emailSimBody, setEmailSimBody] = useState(
    "Hola equipo de Soniquete, queríamos reservar 4 plazas para el concierto de Carmen La Trianera con Diego del Morón.",
  )
  const [emailSimSeats, setEmailSimSeats] = useState("4")
  const [emailSimResult, setEmailSimResult] = useState<{
    decision: string
    summary: string
    autoReplyPreview: string
  } | null>(null)

  // ─── b.1) ABM Intérpretes + Pack de Vídeos ───
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null)
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
  const [minCacheEur, setMinCacheEur] = useState("1500")
  const [artistCity, setArtistCity] = useState("Madrid")
  const [artistEmail, setArtistEmail] = useState("")
  const [artistPhone, setArtistPhone] = useState("")
  const [artistWeb, setArtistWeb] = useState("")
  const [artistBio, setArtistBio] = useState("")
  const [artistRepId, setArtistRepId] = useState<string>(snapshot.representatives[0]?.id ?? "")
  const [expandedArtistIdForVideos, setExpandedArtistIdForVideos] = useState<string | null>(
    snapshot.artists[0]?.id ?? null,
  )

  // ABM Pieza Multimedia
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null)
  const [selectedArtistIdForMedia, setSelectedArtistIdForMedia] = useState<string>(
    snapshot.artists[0]?.id ?? "",
  )
  const [selectedConcertIdForMedia, setSelectedConcertIdForMedia] = useState<string>("")
  const [pieceCode, setPieceCode] = useState<string>(FLAMENCO_MEDIA_PIECES[0].code)
  const [customPieceLabel, setCustomPieceLabel] = useState("")
  const [sourcePlatform, setSourcePlatform] = useState<MediaSourcePlatform>("plataforma")
  const [customTitle, setCustomTitle] = useState("")
  const [pieceUrl, setPieceUrl] = useState("")
  const [customUse, setCustomUse] = useState("")

  // ─── b.2) ABM Representantes ───
  const [editingRepId, setEditingRepId] = useState<string | null>(null)
  const [repName, setRepName] = useState("")
  const [repAgency, setRepAgency] = useState("soniqueteflamenco.com")
  const [repRoleKind, setRepRoleKind] = useState<
    "manager" | "booking_agent" | "apoderado" | "productor"
  >("manager")
  const [repCommission, setRepCommission] = useState("15")
  const [repPhone, setRepPhone] = useState("")
  const [repEmail, setRepEmail] = useState("")
  const [repCity, setRepCity] = useState("Madrid")
  const [repNotes, setRepNotes] = useState("")

  // ─── b.3) ABM Salas, Ateneos y Admón. ───
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null)
  const [venueName, setVenueName] = useState("")
  const [venueKind, setVenueKind] = useState<VenueKind>("sala_flamenco")
  const [venueCity, setVenueCity] = useState("Madrid")
  const [venueCapacity, setVenueCapacity] = useState("200")
  const [venueBudget, setVenueBudget] = useState("2400")
  const [venueProgrammer, setVenueProgrammer] = useState("")
  const [venueEmail, setVenueEmail] = useState("")
  const [venuePhone, setVenuePhone] = useState("")
  const [venueWeb, setVenueWeb] = useState("")
  const [venueNotes, setVenueNotes] = useState("")

  // ─── b.4) ABM Servicios y Actividades Unificados (Agenda + Landing + Agente Único) ───
  const [editingCatalogServiceId, setEditingCatalogServiceId] = useState<string | null>(null)
  const [svcName, setSvcName] = useState("")
  const [svcCategory, setSvcCategory] = useState("Conciertos y Galas Flamencas")
  const [svcType, setSvcType] = useState<"event" | "recurring">("event")
  const [svcDuration, setSvcDuration] = useState("85")
  const [svcPrice, setSvcPrice] = useState("25")
  const [svcDescription, setSvcDescription] = useState("")
  const [svcEventDatesText, setSvcEventDatesText] = useState("")
  const [svcScheduleText, setSvcScheduleText] = useState("20:30 h (Apertura 20:00 h)")
  const [svcSinFecha, setSvcSinFecha] = useState(false)
  const [svcTextoSinFecha, setSvcTextoSinFecha] = useState(
    "Reserva provisional sin compromiso: te avisamos por WhatsApp, SMS o correo al fijarse fecha y quórum.",
  )
  const [svcSinPrecio, setSvcSinPrecio] = useState(false)
  const [svcTextoSinPrecio, setSvcTextoSinPrecio] = useState("")
  const [svcTextoEspecifico, setSvcTextoEspecifico] = useState("")
  const [svcFlyerUrl, setSvcFlyerUrl] = useState(
    "/api/media/stream/flyers/flyer-generico-horizontal.png",
  )
  const [svcVideoUrl, setSvcVideoUrl] = useState(
    "/api/media/stream/services/act-1-presentacion.mp4",
  )
  const [svcMinPeople, setSvcMinPeople] = useState("1")
  const [svcMaxPeople, setSvcMaxPeople] = useState("150")
  const [svcArtistId, setSvcArtistId] = useState<string>(snapshot.artists[0]?.id ?? "")
  const [svcVenueId, setSvcVenueId] = useState<string>(snapshot.venues[0]?.id ?? "")

  // ─── b.5) Pasarela WhatsApp (Evolution API / YCloud / Meta) ───
  const [waProvider, setWaProvider] = useState<"evolution" | "ycloud" | "meta">(
    snapshot.whatsappGateway.provider,
  )
  const [waNumber, setWaNumber] = useState(snapshot.whatsappGateway.whatsappNumber)
  const [evoApiUrl, setEvoApiUrl] = useState(snapshot.whatsappGateway.evolutionApiUrl)
  const [evoInstance, setEvoInstance] = useState(snapshot.whatsappGateway.evolutionInstanceName)
  const [evoApiKey, setEvoApiKey] = useState("")
  const [ycloudApiKey, setYcloudApiKey] = useState("")
  const [metaPhoneId, setMetaPhoneId] = useState(snapshot.whatsappGateway.metaPhoneNumberId)
  const [metaWabaId, setMetaWabaId] = useState(snapshot.whatsappGateway.metaWabaId)
  const [metaToken, setMetaToken] = useState("")
  const [emailAutoBookingEnabled, setEmailAutoBookingEnabled] = useState(
    snapshot.whatsappGateway.emailAutoBookingEnabled,
  )

  // ─── c) ABM Conciertos, Eventos y Reservas Provisionales ───
  const [editingConcertId, setEditingConcertId] = useState<string | null>(null)
  const [concertTitle, setConcertTitle] = useState("")
  const [eventKind, setEventKind] = useState<EventKind>("concierto")
  const [concertArtistId, setConcertArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [concertVenueId, setConcertVenueId] = useState<string>(snapshot.venues[0]?.id ?? "")
  const [concertDateIso, setConcertDateIso] = useState(() => {
    const d = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  })
  const [dateAndPlaceTbd, setDateAndPlaceTbd] = useState(false)
  const [provisionalBookingsOpen, setProvisionalBookingsOpen] = useState(false)
  const [autoNotifyToConfirm, setAutoNotifyToConfirm] = useState(true)
  const [cancelIfBelowMinAttendees, setCancelIfBelowMinAttendees] = useState(true)
  const [minAttendees, setMinAttendees] = useState("50")
  const [currentAttendees, setCurrentAttendees] = useState("12")
  const [concertCache, setConcertCache] = useState("2600")
  const [concertTicket, setConcertTicket] = useState("24")
  const [concertGuitarist, setConcertGuitarist] = useState("Diego del Morón")
  const [concertStatus, setConcertStatus] = useState<
    "propuesta" | "provisional" | "negociacion" | "confirmado" | "celebrado" | "cancelado"
  >("propuesta")
  const [concertNotes, setConcertNotes] = useState("")

  // Reservas provisionales
  const [provConcertId, setProvConcertId] = useState(snapshot.concerts[0]?.id ?? "")
  const [provAttendeeName, setProvAttendeeName] = useState("")
  const [provAttendeePhone, setProvAttendeePhone] = useState("")
  const [provSeats, setProvSeats] = useState("2")
  const [confirmVenueForEventId, setConfirmVenueForEventId] = useState(snapshot.venues[0]?.id ?? "")
  const [confirmDateForEventIso, setConfirmDateForEventIso] = useState(() => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  })

  // ─── d) Simulador de Ofertas → Envíos ───
  const [offerTitle, setOfferTitle] = useState(
    "Ciclo de Otoño · Recital Cante y Toque con Cuadro Flamenco",
  )
  const [offerArtistId, setOfferArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [offerVenueId, setOfferVenueId] = useState(snapshot.venues[0]?.id ?? "")
  const [offerDateText, setOfferDateText] = useState("Viernes 20 de Noviembre · 21:00 h")
  const [offerCache, setOfferCache] = useState("2500")

  // ─── e) Captar Salas / Artistas Web ───
  const [scrapeTargetType, setScrapeTargetType] = useState<"venue" | "artist">("venue")
  const [scrapeUrl, setScrapeUrl] = useState("https://corraldelamoreria.com")
  const [scrapeFallbackName, setScrapeFallbackName] = useState("")
  const [scrapeCity, setScrapeCity] = useState("Madrid")

  // ─── f) ABM Servicios Digitales a Artistas ───
  const [editingDigitalServiceId, setEditingDigitalServiceId] = useState<string | null>(null)
  const [packArtistId, setPackArtistId] = useState(snapshot.artists[0]?.id ?? "")
  const [packPresetIdx, setPackPresetIdx] = useState(0)
  const [packCustomName, setPackCustomName] = useState("")
  const [packStatus, setPackStatus] = useState<
    "propuesta" | "activo" | "en_produccion" | "entregado" | "pausado"
  >("en_produccion")
  const [packDomain, setPackDomain] = useState("artista.soniqueteflamenco.com")
  const [packSetupEur, setPackSetupEur] = useState("950")
  const [packMonthlyEur, setPackMonthlyEur] = useState("190")
  const [packNotes, setPackNotes] = useState("")

  // ─── Listas filtradas por búsqueda instantánea ───
  const filteredArtists = useMemo(() => {
    const q = searchArtists.trim().toLowerCase()
    if (!q) return snapshot.artists
    return snapshot.artists.filter(
      (a) =>
        a.artisticName.toLowerCase().includes(q) ||
        (a.legalName || "").toLowerCase().includes(q) ||
        a.discipline.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        (a.leadGuitarist || "").toLowerCase().includes(q) ||
        (Array.isArray(a.styles) ? a.styles.join(" ") : "").toLowerCase().includes(q),
    )
  }, [snapshot.artists, searchArtists])

  const filteredReps = useMemo(() => {
    const q = searchReps.trim().toLowerCase()
    if (!q) return snapshot.representatives
    return snapshot.representatives.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.agencyName || "").toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.roleKind.toLowerCase().includes(q),
    )
  }, [snapshot.representatives, searchReps])

  const filteredVenues = useMemo(() => {
    const q = searchVenues.trim().toLowerCase()
    if (!q) return snapshot.venues
    return snapshot.venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.kind.toLowerCase().includes(q) ||
        (v.programmerName || "").toLowerCase().includes(q) ||
        (v.email || "").toLowerCase().includes(q),
    )
  }, [snapshot.venues, searchVenues])

  const filteredCatalogServices = useMemo(() => {
    const q = searchCatalogServices.trim().toLowerCase()
    if (!q) return snapshot.catalogServices
    return snapshot.catalogServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.eventDatesText || "").toLowerCase().includes(q),
    )
  }, [snapshot.catalogServices, searchCatalogServices])

  const filteredConcerts = useMemo(() => {
    const q = searchConcerts.trim().toLowerCase()
    if (!q) return snapshot.concerts
    return snapshot.concerts.filter((c) => {
      const artist = snapshot.artists.find((a) => a.id === c.artistId)
      const venue = snapshot.venues.find((v) => v.id === c.venueId)
      return (
        c.title.toLowerCase().includes(q) ||
        c.eventKind.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        (artist?.artisticName || "").toLowerCase().includes(q) ||
        (venue?.name || "").toLowerCase().includes(q)
      )
    })
  }, [snapshot.concerts, snapshot.artists, snapshot.venues, searchConcerts])

  const filteredDigitalServices = useMemo(() => {
    const q = searchDigitalServices.trim().toLowerCase()
    if (!q) return snapshot.digitalServices
    return snapshot.digitalServices.filter((ds) => {
      const artist = snapshot.artists.find((a) => a.id === ds.artistId)
      return (
        ds.packName.toLowerCase().includes(q) ||
        ds.status.toLowerCase().includes(q) ||
        (ds.landingDomain || "").toLowerCase().includes(q) ||
        (artist?.artisticName || "").toLowerCase().includes(q)
      )
    })
  }, [snapshot.digitalServices, snapshot.artists, searchDigitalServices])

  // ─── Helpers para cargar registros en modo Modificación (Edición) ───
  function loadArtistForEdit(a: Snapshot["artists"][number]) {
    setEditingArtistId(a.id)
    setArtisticName(a.artisticName)
    setLegalName(a.legalName ?? "")
    setDiscipline((a.discipline as ArtistDiscipline) || "cante")
    setStylesText(Array.isArray(a.styles) ? a.styles.join(", ") : "Soleá, Bulerías")
    setBringsGroup(a.bringsGroup)
    setGroupFormation(a.groupFormation)
    setLeadGuitarist(a.leadGuitarist ?? "")
    setAltGuitarists(
      Array.isArray(a.alternateGuitarists) ? a.alternateGuitarists.join(", ") : "",
    )
    setBaseCacheEur(String(a.baseCacheEur))
    setMinCacheEur(String(a.minCacheEur))
    setArtistCity(a.city)
    setArtistEmail(a.email ?? "")
    setArtistPhone(a.phone ?? "")
    setArtistWeb(a.websiteUrl ?? "")
    setArtistBio(a.biography ?? "")
    setArtistRepId(a.representativeId ?? "")
    setFeedback(`Editando intérprete «${a.artisticName}». Modifica los campos y pulsa Guardar.`)
  }

  function resetArtistForm() {
    setEditingArtistId(null)
    setArtisticName("")
    setLegalName("")
    setArtistBio("")
    setArtistEmail("")
    setArtistPhone("")
    setArtistWeb("")
  }

  function loadMediaForEdit(m: Snapshot["mediaAssets"][number]) {
    setEditingMediaId(m.id)
    setSelectedArtistIdForMedia(m.artistId ?? "")
    setSelectedConcertIdForMedia(m.concertId ?? "")
    setPieceCode(m.pieceCode)
    setCustomPieceLabel(m.customPieceLabel ?? "")
    setSourcePlatform((m.sourcePlatform as MediaSourcePlatform) || "plataforma")
    setCustomTitle(m.title)
    setPieceUrl(m.fileUrl)
    setCustomUse(m.recommendedUse)
    setFeedback(`Editando pieza multimedia «${m.title}».`)
  }

  function resetMediaForm() {
    setEditingMediaId(null)
    setCustomTitle("")
    setPieceUrl("")
    setCustomUse("")
    setCustomPieceLabel("")
  }

  function loadRepForEdit(r: Snapshot["representatives"][number]) {
    setEditingRepId(r.id)
    setRepName(r.fullName)
    setRepAgency(r.agencyName ?? "")
    setRepRoleKind(
      (r.roleKind as "manager" | "booking_agent" | "apoderado" | "productor") || "manager",
    )
    setRepCommission(String(r.commissionPercent))
    setRepPhone(r.phone ?? "")
    setRepEmail(r.email ?? "")
    setRepCity(r.city)
    setRepNotes(r.notes ?? "")
    setFeedback(`Editando representante «${r.fullName}».`)
  }

  function resetRepForm() {
    setEditingRepId(null)
    setRepName("")
    setRepPhone("")
    setRepEmail("")
    setRepNotes("")
  }

  function loadVenueForEdit(v: Snapshot["venues"][number]) {
    setEditingVenueId(v.id)
    setVenueName(v.name)
    setVenueKind((v.kind as VenueKind) || "sala_flamenco")
    setVenueCity(v.city)
    setVenueCapacity(String(v.capacity))
    setVenueBudget(String(v.typicalBudgetEur))
    setVenueProgrammer(v.programmerName ?? "")
    setVenueEmail(v.email ?? "")
    setVenuePhone(v.phone ?? "")
    setVenueWeb(v.websiteUrl ?? "")
    setVenueNotes(v.notes ?? "")
    setFeedback(`Editando sala/entidad «${v.name}».`)
  }

  function resetVenueForm() {
    setEditingVenueId(null)
    setVenueName("")
    setVenueProgrammer("")
    setVenueEmail("")
    setVenuePhone("")
    setVenueWeb("")
    setVenueNotes("")
  }

  function loadCatalogServiceForEdit(s: Snapshot["catalogServices"][number]) {
    setEditingCatalogServiceId(s.id)
    setSvcName(s.name)
    setSvcCategory(s.category ?? "Conciertos y Galas Flamencas")
    setSvcType(s.serviceType === "event" ? "event" : "recurring")
    setSvcDuration(String(s.durationMin))
    setSvcPrice(String(s.price ?? 0))
    setSvcDescription(s.description ?? s.descriptionForAgent ?? "")
    setSvcEventDatesText(s.eventDatesText ?? "")
    setSvcScheduleText(s.scheduleText ?? "")
    setSvcSinFecha(Boolean(s.sinfechadefinitiva))
    setSvcTextoSinFecha(s.textosinfechadefinitiva ?? "")
    setSvcSinPrecio(Boolean(s.sinpreciodefinitivo))
    setSvcTextoSinPrecio(s.textosinpreciodefinitivo ?? "")
    setSvcTextoEspecifico(s.textoespecifico ?? "")
    setSvcFlyerUrl(s.flyerUrl ?? "/api/media/stream/flyers/flyer-generico-horizontal.png")
    setSvcVideoUrl(s.videoUrl ?? "/api/media/stream/services/act-1-presentacion.mp4")
    setSvcMinPeople(String(s.minPeople))
    setSvcMaxPeople(String(s.maxPeople))
    setSvcArtistId(s.artistId ?? "")
    setSvcVenueId(s.venueId ?? "")
    setFeedback(`Editando servicio unificado «${s.name}».`)
  }

  function resetCatalogServiceForm() {
    setEditingCatalogServiceId(null)
    setSvcName("")
    setSvcDescription("")
    setSvcEventDatesText("")
    setSvcTextoEspecifico("")
  }

  function loadConcertForEdit(c: Snapshot["concerts"][number]) {
    setEditingConcertId(c.id)
    setConcertTitle(c.title)
    setEventKind((c.eventKind as EventKind) || "concierto")
    setConcertArtistId(c.artistId)
    setConcertVenueId(c.venueId ?? "")
    setConcertDateIso(new Date(c.startsAt).toISOString().slice(0, 16))
    setDateAndPlaceTbd(c.dateAndPlaceTbd)
    setProvisionalBookingsOpen(c.provisionalBookingsOpen)
    setAutoNotifyToConfirm(c.autoNotifyToConfirm)
    setCancelIfBelowMinAttendees(c.cancelIfBelowMinAttendees)
    setMinAttendees(String(c.minAttendees))
    setCurrentAttendees(String(c.currentAttendees))
    setConcertCache(String(c.agreedCacheEur))
    setConcertTicket(String(c.ticketPriceEur))
    setConcertGuitarist(c.guitaristName ?? "")
    setConcertStatus(
      (c.status as
        | "propuesta"
        | "provisional"
        | "negociacion"
        | "confirmado"
        | "celebrado"
        | "cancelado") || "propuesta",
    )
    setConcertNotes(c.notes ?? "")
    setFeedback(`Editando evento/concierto «${c.title}».`)
  }

  function resetConcertForm() {
    setEditingConcertId(null)
    setConcertTitle("")
    setConcertNotes("")
  }

  function loadDigitalServiceForEdit(ds: Snapshot["digitalServices"][number]) {
    setEditingDigitalServiceId(ds.id)
    setPackArtistId(ds.artistId)
    setPackCustomName(ds.packName)
    setPackStatus(
      (ds.status as "propuesta" | "activo" | "en_produccion" | "entregado" | "pausado") ||
        "en_produccion",
    )
    setPackDomain(ds.landingDomain ?? "")
    setPackSetupEur(String(ds.setupFeeEur))
    setPackMonthlyEur(String(ds.monthlyFeeEur))
    setPackNotes(ds.notes ?? "")
    setFeedback(`Editando pack digital «${ds.packName}».`)
  }

  function resetDigitalServiceForm() {
    setEditingDigitalServiceId(null)
    setPackCustomName("")
    setPackNotes("")
  }

  return (
    <div className="space-y-6">
      {/* Cabecera e Identidad Unificada */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-rose-50/60 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-700 text-white hover:bg-amber-800">
                soniqueteflamenco.com · CRM + Landing + Agenda Unificada
              </Badge>
              <Badge variant="outline" className="border-amber-300 bg-white text-amber-900">
                5 Canales de Reserva: Landing · WhatsApp ({snapshot.whatsappGateway.provider.toUpperCase()}) · Telegram · VAPI · Email
              </Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900">
              Centro de Promoción Artística, Mantenimientos Maestros y Servicios en Agenda
            </h2>
            <p className="text-sm text-stone-600">
              Cualquier alta, baja o modificación en los maestros o en los servicios/conciertos actualiza automáticamente la Agenda, la Landing Web y el Agente Único de Reservas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/agenda">
              <Button variant="outline" size="sm" className="gap-1.5 bg-white">
                <CalendarCheck2 className="size-4 text-amber-700" />
                Ver en Agenda ({snapshot.catalogServices.length} servicios)
              </Button>
            </Link>
            <a href="/api/widget/services" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 bg-white">
                <Globe className="size-4 text-emerald-700" />
                API Landing (/api/widget/services)
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium text-emerald-800 underline"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {/* ─── NIVEL 1: LOS 6 BOTONES PRINCIPALES AGRUPADOS (a - f) ─── */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setMainSection("a_correo")}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            mainSection === "a_correo"
              ? "border-amber-700 bg-amber-900 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase">
              a · Correo
            </span>
            <Mail className="size-4 shrink-0 opacity-80" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold leading-snug">Opción Correo</p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Hostinger IMAP/SMTP + IA Auto-Reservas
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMainSection("b_mantenimientos")}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            mainSection === "b_mantenimientos"
              ? "border-amber-700 bg-amber-900 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase">
              b · Maestros
            </span>
            <Settings2 className="size-4 shrink-0 opacity-80" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold leading-snug">Mantenimientos (ABM)</p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Intérpretes+Vídeos, Rep., Salas, Servicios
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMainSection("c_conciertos")}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            mainSection === "c_conciertos"
              ? "border-amber-700 bg-amber-900 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase">
              c · Eventos
            </span>
            <CalendarCheck2 className="size-4 shrink-0 opacity-80" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold leading-snug">
              Conciertos y Eventos ({snapshot.concerts.length})
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Reservas provisionales, quórum y contratos
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMainSection("d_simulador")}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            mainSection === "d_simulador"
              ? "border-amber-700 bg-amber-900 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase">
              d · Ofertas
            </span>
            <Send className="size-4 shrink-0 opacity-80" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold leading-snug">Simulador de Ofertas</p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Genera propuesta con vídeos → Envíos
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMainSection("e_captar_web")}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            mainSection === "e_captar_web"
              ? "border-amber-700 bg-amber-900 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase">
              e · Captación
            </span>
            <Globe className="size-4 shrink-0 opacity-80" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold leading-snug">Captar Salas / Artistas Web</p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Extrae ficha de URL para enviar oferta
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMainSection("f_servicios_artistas")}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            mainSection === "f_servicios_artistas"
              ? "border-amber-700 bg-amber-900 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold uppercase">
              f · Packs 360º
            </span>
            <Sparkles className="size-4 shrink-0 opacity-80" />
          </div>
          <div className="mt-2">
            <p className="text-sm font-bold leading-snug">
              Servicios Digitales a Artistas ({snapshot.digitalServices.length})
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              Landing + IA + Redes + 9 Vídeos
            </p>
          </div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
          SECCIÓN a) OPCIÓN CORREO (Buzón Hostinger + Evaluador IA de Reservas por Correo como en crm_salvadora)
      ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
      {mainSection === "a_correo" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-xl border bg-white p-5 shadow-xs lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Badge className="bg-blue-700 text-white">a.1 · Buzón Oficial Hostinger</Badge>
                <h3 className="mt-1 text-base font-bold text-stone-900">
                  {snapshot.hostingerMailbox.emailAddress}
                </h3>
              </div>
              <Badge
                className={
                  snapshot.hostingerMailbox.status === "connected"
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                }
              >
                {snapshot.hostingerMailbox.status === "connected"
                  ? "IMAP/SMTP Conectado"
                  : "Listo para activar con contraseña"}
              </Badge>
            </div>

            <div className="rounded-lg border bg-stone-50 p-3 text-xs text-stone-700 space-y-1">
              <p>
                <strong>Dominio:</strong> {snapshot.hostingerMailbox.domain} (
                {snapshot.hostingerMailbox.websiteUrl})
              </p>
              <p>
                <strong>Entrada IMAP:</strong> {snapshot.hostingerMailbox.imapHost}:
                {snapshot.hostingerMailbox.imapPort} ({snapshot.hostingerMailbox.imapSecurity})
              </p>
              <p>
                <strong>Salida SMTP:</strong> {snapshot.hostingerMailbox.smtpHost}:
                {snapshot.hostingerMailbox.smtpPort} ({snapshot.hostingerMailbox.smtpSecurity})
              </p>
            </div>

            <div className="space-y-2">
              <Label>Contraseña del buzón Hostinger (se guarda cifrada en el servidor)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="password"
                  value={hostingerPassword}
                  onChange={(e) => setHostingerPassword(e.target.value)}
                  placeholder="Contraseña de soniqueteflamenco@soniqueteflamenco.com"
                  className="max-w-xs bg-white text-sm"
                />
                <Button
                  size="sm"
                  disabled={!canManage || isPending || hostingerPassword.trim().length < 4}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await configureHostingerEmailAction({
                        password: hostingerPassword,
                      })
                      setHostingerPassword("")
                      setFeedback(
                        `Buzón ${res.emailAddress} conectado en IMAP (${res.imapHost}:${res.imapPort}) y SMTP (${res.smtpHost}:${res.smtpPort}).`,
                      )
                      router.refresh()
                    })
                  }}
                >
                  Guardar y Activar Buzón
                </Button>
                <Link href="/canales/correo">
                  <Button size="sm" variant="outline" className="gap-1">
                    Abrir Canal Correo
                    <ExternalLink className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Evaluador IA de Diálogo por Email (como en crm_salvadora) */}
          <div className="space-y-4 rounded-xl border bg-white p-5 shadow-xs lg:col-span-6">
            <div>
              <Badge className="bg-amber-700 text-white">
                a.2 · Evaluador IA de Reservas por Correo (Estilo Salvadora)
              </Badge>
              <h3 className="mt-1 text-base font-bold text-stone-900">
                Clasificación Automática: AUTO_BOOKING · AUTO_INFO · HUMAN_HANDOFF
              </h3>
              <p className="text-xs text-stone-500">
                Cuando entra un correo en {snapshot.hostingerMailbox.emailAddress} o desde el formulario de la Landing, el Agente Único evalúa si contiene solicitud de reserva para registrarla en la Agenda y contestar al instante.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nombre del remitente</Label>
                <Input
                  value={emailSimSenderName}
                  onChange={(e) => setEmailSimSenderName(e.target.value)}
                />
              </div>
              <div>
                <Label>Correo del remitente</Label>
                <Input
                  value={emailSimSenderEmail}
                  onChange={(e) => setEmailSimSenderEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Teléfono (para aviso SMS/WhatsApp)</Label>
                <Input
                  value={emailSimSenderPhone}
                  onChange={(e) => setEmailSimSenderPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>Plazas solicitadas</Label>
                <Input
                  type="number"
                  value={emailSimSeats}
                  onChange={(e) => setEmailSimSeats(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Asunto del correo</Label>
                <Input
                  value={emailSimSubject}
                  onChange={(e) => setEmailSimSubject(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Cuerpo del correo recibido</Label>
                <Textarea
                  rows={2}
                  value={emailSimBody}
                  onChange={(e) => setEmailSimBody(e.target.value)}
                />
              </div>
            </div>

            <Button
              disabled={!canManage || isPending}
              className="w-full bg-amber-800 hover:bg-amber-900"
              onClick={() => {
                startTransition(async () => {
                  const res = await evaluateEmailAutoBookingAction({
                    senderName: emailSimSenderName,
                    senderEmail: emailSimSenderEmail,
                    senderPhone: emailSimSenderPhone,
                    subject: emailSimSubject,
                    body: emailSimBody,
                    seats: Number(emailSimSeats) || 2,
                    concertId: snapshot.concerts[0]?.id,
                  })
                  setEmailSimResult(res)
                  setFeedback(`Correo procesado con decisión: ${res.decision}.`)
                  router.refresh()
                })
              }}
            >
              Probar Evaluador IA y Registrar Reserva desde Email
            </Button>

            {emailSimResult && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">Decisión del Agente Único:</span>
                  <Badge className="bg-emerald-700 text-white">{emailSimResult.decision}</Badge>
                </div>
                <p className="text-stone-700">{emailSimResult.summary}</p>
                <div className="rounded border bg-white p-2 text-stone-800">
                  <strong>Respuesta automática enviada:</strong> {emailSimResult.autoReplyPreview}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
          SECCIÓN b) MANTENIMIENTOS (Sub-barra de botones con Búsqueda + Alta + Baja + Modificación)
      ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
      {mainSection === "b_mantenimientos" && (
        <div className="space-y-5">
          {/* Sub-botones de Mantenimientos */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-100/80 p-2">
            <button
              type="button"
              onClick={() => setMaintSubTab("interpretes_videos")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                maintSubTab === "interpretes_videos"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <Music className="size-3.5" />
              1. Intérpretes + Pack de Vídeos ({snapshot.artists.length} / {snapshot.mediaAssets.length})
            </button>

            <button
              type="button"
              onClick={() => setMaintSubTab("representantes")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                maintSubTab === "representantes"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <UserCheck className="size-3.5" />
              2. Representantes ({snapshot.representatives.length})
            </button>

            <button
              type="button"
              onClick={() => setMaintSubTab("salas_ateneos")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                maintSubTab === "salas_ateneos"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <Building2 className="size-3.5" />
              3. Salas, Ateneos y Admón. ({snapshot.venues.length})
            </button>

            <button
              type="button"
              onClick={() => setMaintSubTab("servicios_agenda")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                maintSubTab === "servicios_agenda"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <CalendarCheck2 className="size-3.5" />
              4. Servicios y Actividades en Agenda ({snapshot.catalogServices.length})
            </button>

            <button
              type="button"
              onClick={() => setMaintSubTab("servicios_digitales_y_pasarela")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                maintSubTab === "servicios_digitales_y_pasarela"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <Bot className="size-3.5" />
              5. Catálogo Digital, Agente Único y WhatsApp ({snapshot.whatsappGateway.provider.toUpperCase()})
            </button>
          </div>

          {/* ─── SUB-PESTAÑA b.1: INTÉRPRETES + PACK DE VÍDEOS (Búsqueda + Alta + Modificación + Baja) ─── */}
          {maintSubTab === "interpretes_videos" && (
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-12">
                {/* Listado con buscador instantáneo */}
                <div className="space-y-4 lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3.5">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
                      <Input
                        value={searchArtists}
                        onChange={(e) => setSearchArtists(e.target.value)}
                        placeholder="Buscar intérprete por nombre, palo, guitarrista o ciudad..."
                        className="pl-9 text-sm"
                      />
                    </div>
                    <Badge variant="secondary">
                      {filteredArtists.length} de {snapshot.artists.length} intérpretes
                    </Badge>
                  </div>

                  {filteredArtists.map((artist) => {
                    const rep = snapshot.representatives.find((r) => r.id === artist.representativeId)
                    const mediaList = snapshot.mediaAssets.filter((m) => m.artistId === artist.id)
                    const isExpanded = expandedArtistIdForVideos === artist.id

                    return (
                      <div
                        key={artist.id}
                        className={`rounded-xl border bg-white p-5 shadow-xs transition ${
                          editingArtistId === artist.id ? "ring-2 ring-amber-600" : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold text-stone-900">
                                {artist.artisticName}
                              </h3>
                              <Badge className="bg-amber-100 text-amber-900">
                                {ARTIST_DISCIPLINE_LABELS[artist.discipline as ArtistDiscipline] ??
                                  artist.discipline}
                              </Badge>
                              <Badge variant="outline">
                                Caché: {artist.baseCacheEur} € (mín. {artist.minCacheEur} €)
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-stone-500">
                              {artist.city} · {artist.email || "Sin email"} ·{" "}
                              {artist.phone || "Sin teléfono"}
                              {rep ? ` · Rep.: ${rep.fullName}` : ""}
                            </p>
                          </div>

                          {/* Botones de Acción ABM: Editar, Vídeos, Borrar */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs"
                              onClick={() => loadArtistForEdit(artist)}
                            >
                              <Edit3 className="size-3.5" />
                              Modificar
                            </Button>
                            <Button
                              size="sm"
                              variant={isExpanded ? "default" : "outline"}
                              className="h-8 gap-1 text-xs"
                              onClick={() =>
                                setExpandedArtistIdForVideos(isExpanded ? null : artist.id)
                              }
                            >
                              <Video className="size-3.5" />
                              Pack Vídeos ({mediaList.length})
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManage || isPending}
                              className="h-8 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                startTransition(async () => {
                                  await deleteArtistAction(artist.id)
                                  if (editingArtistId === artist.id) resetArtistForm()
                                  setFeedback(`Intérprete «${artist.artisticName}» eliminado.`)
                                  router.refresh()
                                })
                              }}
                            >
                              <Trash2 className="size-3.5" />
                              Baja
                            </Button>
                          </div>
                        </div>

                        <p className="mt-2.5 text-sm text-stone-700">{artist.biography}</p>

                        <div className="mt-3 rounded-lg bg-stone-50 p-2.5 text-xs text-stone-700">
                          <span className="font-semibold">
                            <Guitar className="mr-1 inline size-3.5 text-amber-700" />
                            Guitarrista titular:
                          </span>{" "}
                          {artist.leadGuitarist || "A definir"} ·{" "}
                          <span className="font-semibold">Formación:</span> {artist.groupFormation}
                        </div>

                        {/* Desplegable de Vídeos del Intérprete con ABM de cada pieza */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-bold text-amber-950">
                                Pack de 9 Vídeos (.mp4), Flyers, Portadas y YouTube de {artist.artisticName}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs bg-white"
                                disabled={!canManage || isPending}
                                onClick={() => {
                                  startTransition(async () => {
                                    const res = await generateFullMediaPackServerAction({
                                      artistId: artist.id,
                                      subjectName: artist.artisticName,
                                    })
                                    setFeedback(
                                      `Generadas ${res.countCreated} piezas para ${artist.artisticName}.`,
                                    )
                                    router.refresh()
                                  })
                                }}
                              >
                                Regenerar Pack 12 Piezas
                              </Button>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {mediaList.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex flex-col justify-between rounded-lg border bg-white p-2.5 text-xs"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <Badge variant="outline" className="text-[10px]">
                                        {m.pieceCode}
                                      </Badge>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => loadMediaForEdit(m)}
                                          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            startTransition(async () => {
                                              await deleteMediaAssetAction(m.id)
                                              setFeedback(`Pieza «${m.title}» eliminada.`)
                                              router.refresh()
                                            })
                                          }}
                                          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                                        >
                                          Borrar
                                        </button>
                                      </div>
                                    </div>
                                    <p className="mt-1 font-semibold text-stone-900">{m.title}</p>
                                    <p className="truncate text-[11px] text-stone-500">{m.fileUrl}</p>
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-stone-500">{m.formatLabel}</span>
                                    <a
                                      href={m.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:underline"
                                    >
                                      <PlayCircle className="size-3.5" />
                                      Abrir
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Formularios de Alta / Modificación de Intérprete y de Pieza Multimedia */}
                <div className="space-y-6 lg:col-span-5">
                  <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-stone-900">
                        {editingArtistId ? "Modificar Intérprete" : "Alta de Nuevo Intérprete"}
                      </h3>
                      {editingArtistId && (
                        <Button size="sm" variant="ghost" onClick={resetArtistForm}>
                          <X className="mr-1 size-3.5" /> Cancelar edición
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>Nombre artístico *</Label>
                        <Input
                          value={artisticName}
                          onChange={(e) => setArtisticName(e.target.value)}
                          placeholder="Ej. Rocío «La Jerezana»"
                        />
                      </div>
                      <div>
                        <Label>Disciplina</Label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
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
                        <Label>Representante asignado</Label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={artistRepId}
                          onChange={(e) => setArtistRepId(e.target.value)}
                        >
                          <option value="">Sin representante fijo</option>
                          {snapshot.representatives.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.fullName}
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
                      <div>
                        <Label>Caché mínimo (€)</Label>
                        <Input
                          type="number"
                          value={minCacheEur}
                          onChange={(e) => setMinCacheEur(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Guitarrista titular</Label>
                        <Input
                          value={leadGuitarist}
                          onChange={(e) => setLeadGuitarist(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Ciudad base</Label>
                        <Input
                          value={artistCity}
                          onChange={(e) => setArtistCity(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Formación del grupo</Label>
                        <Input
                          value={groupFormation}
                          onChange={(e) => setGroupFormation(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Palos principales (separados por coma)</Label>
                        <Input
                          value={stylesText}
                          onChange={(e) => setStylesText(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Correo</Label>
                        <Input
                          value={artistEmail}
                          onChange={(e) => setArtistEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Teléfono</Label>
                        <Input
                          value={artistPhone}
                          onChange={(e) => setArtistPhone(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Biografía artística</Label>
                        <Textarea
                          rows={2}
                          value={artistBio}
                          onChange={(e) => setArtistBio(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button
                      disabled={!canManage || isPending || !artisticName.trim()}
                      className="w-full bg-amber-800 hover:bg-amber-900"
                      onClick={() => {
                        startTransition(async () => {
                          const payload = {
                            id: editingArtistId ?? undefined,
                            artisticName,
                            legalName: legalName || null,
                            discipline,
                            biography:
                              artistBio ||
                              `${artisticName}, especialista en ${stylesText}, con cuadro propio.`,
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
                            baseCacheEur: Number(baseCacheEur) || 2000,
                            minCacheEur: Number(minCacheEur) || 1400,
                            city: artistCity,
                            email: artistEmail || null,
                            phone: artistPhone || null,
                            websiteUrl: artistWeb || null,
                            representativeId: artistRepId || null,
                            generateStandardMediaPack: !editingArtistId,
                          }
                          if (editingArtistId) {
                            await updateArtistAction(payload)
                            setFeedback(`Intérprete «${artisticName}» actualizado correctamente.`)
                          } else {
                            await createArtistAction(payload)
                            setFeedback(
                              `Intérprete «${artisticName}» dado de alta con su pack de vídeos.`,
                            )
                          }
                          resetArtistForm()
                          router.refresh()
                        })
                      }}
                    >
                      {editingArtistId
                        ? "Guardar Cambios del Intérprete"
                        : "Dar de Alta Intérprete + Pack 9 Vídeos"}
                    </Button>
                  </div>

                  {/* Formulario de Alta / Modificación de Pieza Multimedia / Pack de Vídeos */}
                  <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-stone-900">
                        {editingMediaId
                          ? "Modificar Pieza Multimedia / Vídeo"
                          : "Añadir Pieza al Pack de Vídeos / YouTube"}
                      </h3>
                      {editingMediaId && (
                        <Button size="sm" variant="ghost" onClick={resetMediaForm}>
                          <X className="mr-1 size-3.5" /> Cancelar
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-2.5">
                      <div>
                        <Label>Intérprete</Label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={selectedArtistIdForMedia}
                          onChange={(e) => setSelectedArtistIdForMedia(e.target.value)}
                        >
                          {snapshot.artists.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.artisticName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Tipo de Salida (9 vídeos .mp4, flyers, portadas o libre)</Label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={pieceCode}
                          onChange={(e) => setPieceCode(e.target.value)}
                        >
                          {FLAMENCO_MEDIA_PIECES.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.label} ({p.formatLabel})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Origen</Label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={sourcePlatform}
                          onChange={(e) =>
                            setSourcePlatform(e.target.value as MediaSourcePlatform)
                          }
                        >
                          {Object.entries(MEDIA_SOURCE_PLATFORM_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Título de la pieza *</Label>
                        <Input
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="Ej. Promo Horizontal 1 min o Directo en Sala Villanos"
                        />
                      </div>
                      <div>
                        <Label>URL o ruta en /api/media/stream/... *</Label>
                        <Input
                          value={pieceUrl}
                          onChange={(e) => setPieceUrl(e.target.value)}
                          placeholder="/api/media/stream/services/act-1-presentacion.mp4 o https://youtu.be/..."
                        />
                      </div>
                    </div>

                    <Button
                      disabled={!canManage || isPending || !customTitle.trim() || !pieceUrl.trim()}
                      className="w-full"
                      onClick={() => {
                        startTransition(async () => {
                          const meta =
                            FLAMENCO_MEDIA_PIECES.find((p) => p.code === pieceCode) ??
                            FLAMENCO_MEDIA_PIECES[0]
                          const payload = {
                            id: editingMediaId ?? undefined,
                            artistId: selectedArtistIdForMedia || null,
                            concertId: selectedConcertIdForMedia || null,
                            pieceCode,
                            customPieceLabel:
                              pieceCode === "custom_otro" ? customPieceLabel : null,
                            sourcePlatform,
                            title: customTitle,
                            formatLabel: meta.formatLabel,
                            durationSeconds: meta.durationSeconds,
                            maxSizeMb: meta.maxSizeMb,
                            dimensions: meta.dimensions,
                            recommendedUse: customUse || meta.recommendedUse,
                            fileUrl: pieceUrl,
                            releasePhase: meta.releasePhase,
                          }
                          if (editingMediaId) {
                            await updateMediaAssetAction(payload)
                            setFeedback(`Pieza «${customTitle}» modificada.`)
                          } else {
                            await createMediaAssetAction(payload)
                            setFeedback(`Pieza «${customTitle}» añadida al pack multimedia.`)
                          }
                          resetMediaForm()
                          router.refresh()
                        })
                      }}
                    >
                      {editingMediaId ? "Guardar Cambios de Pieza" : "Añadir Pieza Multimedia"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── SUB-PESTAÑA b.2: REPRESENTANTES (Búsqueda + Alta + Modificación + Baja) ─── */}
          {maintSubTab === "representantes" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3.5">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
                    <Input
                      value={searchReps}
                      onChange={(e) => setSearchReps(e.target.value)}
                      placeholder="Buscar representante por nombre, agencia o ciudad..."
                      className="pl-9 text-sm"
                    />
                  </div>
                  <Badge variant="secondary">{filteredReps.length} representantes</Badge>
                </div>

                {filteredReps.map((rep) => (
                  <div
                    key={rep.id}
                    className={`rounded-xl border bg-white p-4 shadow-xs ${
                      editingRepId === rep.id ? "ring-2 ring-amber-600" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-900">{rep.fullName}</h4>
                          <Badge variant="secondary">{rep.roleKind}</Badge>
                          <Badge className="bg-amber-100 text-amber-900">
                            Comisión {rep.commissionPercent}%
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-500">
                          {rep.agencyName || "Agencia propia"} · {rep.city} · {rep.email} ·{" "}
                          {rep.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() => loadRepForEdit(rep)}
                        >
                          <Edit3 className="size-3.5" /> Modificar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage || isPending}
                          className="h-8 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            startTransition(async () => {
                              await deleteRepresentativeAction(rep.id)
                              if (editingRepId === rep.id) resetRepForm()
                              setFeedback(`Representante «${rep.fullName}» eliminado.`)
                              router.refresh()
                            })
                          }}
                        >
                          <Trash2 className="size-3.5" /> Baja
                        </Button>
                      </div>
                    </div>
                    {rep.notes && <p className="mt-2 text-xs text-stone-600">{rep.notes}</p>}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">
                    {editingRepId ? "Modificar Representante" : "Alta de Representante"}
                  </h3>
                  {editingRepId && (
                    <Button size="sm" variant="ghost" onClick={resetRepForm}>
                      <X className="mr-1 size-3.5" /> Cancelar
                    </Button>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div>
                    <Label>Nombre completo *</Label>
                    <Input value={repName} onChange={(e) => setRepName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Agencia / Oficina</Label>
                    <Input value={repAgency} onChange={(e) => setRepAgency(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Rol</Label>
                      <select
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        value={repRoleKind}
                        onChange={(e) =>
                          setRepRoleKind(
                            e.target.value as
                              | "manager"
                              | "booking_agent"
                              | "apoderado"
                              | "productor",
                          )
                        }
                      >
                        <option value="manager">Manager</option>
                        <option value="booking_agent">Booking Agent</option>
                        <option value="apoderado">Apoderado</option>
                        <option value="productor">Productor</option>
                      </select>
                    </div>
                    <div>
                      <Label>Comisión (%)</Label>
                      <Input
                        type="number"
                        value={repCommission}
                        onChange={(e) => setRepCommission(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Teléfono</Label>
                      <Input value={repPhone} onChange={(e) => setRepPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label>Ciudad</Label>
                      <Input value={repCity} onChange={(e) => setRepCity(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={repEmail} onChange={(e) => setRepEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      rows={2}
                      value={repNotes}
                      onChange={(e) => setRepNotes(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  disabled={!canManage || isPending || !repName.trim()}
                  className="w-full bg-amber-800 hover:bg-amber-900"
                  onClick={() => {
                    startTransition(async () => {
                      const payload = {
                        id: editingRepId ?? undefined,
                        fullName: repName,
                        agencyName: repAgency,
                        roleKind: repRoleKind,
                        commissionPercent: Number(repCommission) || 15,
                        phone: repPhone || null,
                        email: repEmail || null,
                        city: repCity,
                        notes: repNotes || null,
                      }
                      if (editingRepId) {
                        await updateRepresentativeAction(payload)
                        setFeedback(`Representante «${repName}» actualizado.`)
                      } else {
                        await createRepresentativeAction(payload)
                        setFeedback(`Representante «${repName}» dado de alta.`)
                      }
                      resetRepForm()
                      router.refresh()
                    })
                  }}
                >
                  {editingRepId ? "Guardar Cambios" : "Dar de Alta Representante"}
                </Button>
              </div>
            </div>
          )}

          {/* ─── SUB-PESTAÑA b.3: SALAS, ATENEOS Y ADMÓN. (Búsqueda + Alta + Modificación + Baja) ─── */}
          {maintSubTab === "salas_ateneos" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3.5">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
                    <Input
                      value={searchVenues}
                      onChange={(e) => setSearchVenues(e.target.value)}
                      placeholder="Buscar sala, tablao, ateneo o ayuntamiento..."
                      className="pl-9 text-sm"
                    />
                  </div>
                  <Badge variant="secondary">{filteredVenues.length} salas/entidades</Badge>
                </div>

                {filteredVenues.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-xl border bg-white p-4 shadow-xs ${
                      editingVenueId === v.id ? "ring-2 ring-amber-600" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-stone-900">{v.name}</h4>
                          <Badge className="bg-amber-100 text-amber-900">
                            {VENUE_KIND_LABELS[v.kind as VenueKind] ?? v.kind}
                          </Badge>
                          <Badge variant="outline">Aforo: {v.capacity}</Badge>
                          <Badge variant="outline">Presupuesto: {v.typicalBudgetEur} €</Badge>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {v.city} · Programación: {v.programmerName || "General"} ·{" "}
                          {v.email || "Sin email"} · {v.phone || "Sin tel."}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() => loadVenueForEdit(v)}
                        >
                          <Edit3 className="size-3.5" /> Modificar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage || isPending}
                          className="h-8 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            startTransition(async () => {
                              await deleteVenueAction(v.id)
                              if (editingVenueId === v.id) resetVenueForm()
                              setFeedback(`Sala/entidad «${v.name}» eliminada.`)
                              router.refresh()
                            })
                          }}
                        >
                          <Trash2 className="size-3.5" /> Baja
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">
                    {editingVenueId
                      ? "Modificar Sala / Ateneo / Admón."
                      : "Alta de Sala, Ateneo o Ayuntamiento"}
                  </h3>
                  {editingVenueId && (
                    <Button size="sm" variant="ghost" onClick={resetVenueForm}>
                      <X className="mr-1 size-3.5" /> Cancelar
                    </Button>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Nombre de la sala o entidad *</Label>
                    <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
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
                  <div>
                    <Label>Ciudad</Label>
                    <Input value={venueCity} onChange={(e) => setVenueCity(e.target.value)} />
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
                    <Label>Presupuesto habitual (€)</Label>
                    <Input
                      type="number"
                      value={venueBudget}
                      onChange={(e) => setVenueBudget(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Responsable de Programación</Label>
                    <Input
                      value={venueProgrammer}
                      onChange={(e) => setVenueProgrammer(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={venueEmail} onChange={(e) => setVenueEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={venuePhone} onChange={(e) => setVenuePhone(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Web oficial</Label>
                    <Input value={venueWeb} onChange={(e) => setVenueWeb(e.target.value)} />
                  </div>
                </div>

                <Button
                  disabled={!canManage || isPending || !venueName.trim()}
                  className="w-full bg-amber-800 hover:bg-amber-900"
                  onClick={() => {
                    startTransition(async () => {
                      const payload = {
                        id: editingVenueId ?? undefined,
                        name: venueName,
                        kind: venueKind,
                        city: venueCity,
                        province: venueCity,
                        country: "España",
                        capacity: Number(venueCapacity) || 180,
                        typicalBudgetEur: Number(venueBudget) || 2200,
                        programmerName: venueProgrammer || null,
                        email: venueEmail || null,
                        phone: venuePhone || null,
                        websiteUrl: venueWeb || null,
                        notes: venueNotes || null,
                      }
                      if (editingVenueId) {
                        await updateVenueAction(payload)
                        setFeedback(`Sala «${venueName}» actualizada.`)
                      } else {
                        await createVenueAction(payload)
                        setFeedback(`Sala «${venueName}» dada de alta.`)
                      }
                      resetVenueForm()
                      router.refresh()
                    })
                  }}
                >
                  {editingVenueId ? "Guardar Cambios de Sala" : "Dar de Alta Sala / Entidad"}
                </Button>
              </div>
            </div>
          )}

          {/* ─── SUB-PESTAÑA b.4: SERVICIOS Y ACTIVIDADES UNIFICADOS (Agenda + Landing + VAPI + WhatsApp) ─── */}
          {maintSubTab === "servicios_agenda" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
                  <strong>Fuente Única de Verdad (equivalente a crm_salvadora):</strong> Todos los servicios y eventos de esta lista están integrados en la <strong>Agenda (/agenda)</strong> y se publican en tiempo real en <code>/api/widget/services</code> para la Landing, WhatsApp, Telegram, VAPI y Correo.
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3.5">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
                    <Input
                      value={searchCatalogServices}
                      onChange={(e) => setSearchCatalogServices(e.target.value)}
                      placeholder="Buscar servicio o actividad por nombre, categoría o fechas..."
                      className="pl-9 text-sm"
                    />
                  </div>
                  <Badge variant="secondary">{filteredCatalogServices.length} servicios</Badge>
                </div>

                {filteredCatalogServices.map((svc) => (
                  <div
                    key={svc.id}
                    className={`rounded-xl border bg-white p-4 shadow-xs space-y-2 ${
                      editingCatalogServiceId === svc.id ? "ring-2 ring-amber-600" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-stone-900">{svc.name}</h4>
                          <Badge className="bg-amber-100 text-amber-900">
                            {svc.category || "General"}
                          </Badge>
                          <Badge variant="outline">
                            {svc.serviceType === "event" ? "Evento / Concierto" : "Cita Recurrente"}
                          </Badge>
                          <Badge variant="outline">
                            {svc.sinpreciodefinitivo
                              ? svc.textosinpreciodefinitivo || "Precio a consultar"
                              : `${svc.price ?? 0} €`}
                          </Badge>
                          {svc.sinfechadefinitiva && (
                            <Badge className="bg-purple-700 text-white">
                              Reserva Provisional (Sin fecha fija)
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-stone-600">
                          {svc.description || svc.descriptionForAgent}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          onClick={() => loadCatalogServiceForEdit(svc)}
                        >
                          <Edit3 className="size-3.5" /> Modificar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage || isPending}
                          className="h-8 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            startTransition(async () => {
                              await deleteCatalogServiceAction(svc.id)
                              if (editingCatalogServiceId === svc.id) resetCatalogServiceForm()
                              setFeedback(`Servicio «${svc.name}» eliminado de Agenda y Landing.`)
                              router.refresh()
                            })
                          }}
                        >
                          <Trash2 className="size-3.5" /> Baja
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[11px] text-stone-500">
                      <span>⏱ {svc.durationMin} min</span>
                      <span>📅 {svc.eventDatesText || svc.scheduleText || "Según agenda"}</span>
                      <span>👥 Aforo/Plazas: {svc.minPeople} - {svc.maxPeople}</span>
                      {svc.flyerUrl && (
                        <a
                          href={svc.flyerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-800 underline"
                        >
                          Ver Flyer
                        </a>
                      )}
                      {svc.videoUrl && (
                        <a
                          href={svc.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-800 underline"
                        >
                          Ver Vídeo
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">
                    {editingCatalogServiceId
                      ? "Modificar Servicio / Actividad (Agenda + Landing)"
                      : "Alta de Servicio / Actividad en Agenda y Landing"}
                  </h3>
                  {editingCatalogServiceId && (
                    <Button size="sm" variant="ghost" onClick={resetCatalogServiceForm}>
                      <X className="mr-1 size-3.5" /> Cancelar
                    </Button>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Nombre del servicio o actividad *</Label>
                    <Input
                      value={svcName}
                      onChange={(e) => setSvcName(e.target.value)}
                      placeholder="Ej. Recital Flamenco o Reunión de Contratación"
                    />
                  </div>
                  <div>
                    <Label>Categoría en Landing</Label>
                    <Input
                      value={svcCategory}
                      onChange={(e) => setSvcCategory(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Tipo en Agenda</Label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={svcType}
                      onChange={(e) => setSvcType(e.target.value as "event" | "recurring")}
                    >
                      <option value="event">Evento / Concierto / Viaje</option>
                      <option value="recurring">Cita Recurrente (Horario semanal)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Duración (min)</Label>
                    <Input
                      type="number"
                      value={svcDuration}
                      onChange={(e) => setSvcDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Precio (€)</Label>
                    <Input
                      type="number"
                      value={svcPrice}
                      onChange={(e) => setSvcPrice(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Texto de fechas / convocatoria</Label>
                    <Input
                      value={svcEventDatesText}
                      onChange={(e) => setSvcEventDatesText(e.target.value)}
                      placeholder="Ej. Sábado 21 de Noviembre · 20:30 h"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Horario / Turnos</Label>
                    <Input
                      value={svcScheduleText}
                      onChange={(e) => setSvcScheduleText(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800">
                      <input
                        type="checkbox"
                        checked={svcSinFecha}
                        onChange={(e) => setSvcSinFecha(e.target.checked)}
                      />
                      Sin fecha definitiva (Admite reserva provisional con aviso al confirmar)
                    </label>
                  </div>
                  {svcSinFecha && (
                    <div className="sm:col-span-2">
                      <Label>Texto reserva sin fecha definitiva</Label>
                      <Input
                        value={svcTextoSinFecha}
                        onChange={(e) => setSvcTextoSinFecha(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <Label>URL Flyer (/api/media/stream/...)</Label>
                    <Input
                      value={svcFlyerUrl}
                      onChange={(e) => setSvcFlyerUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>URL Vídeo (/api/media/stream/...)</Label>
                    <Input
                      value={svcVideoUrl}
                      onChange={(e) => setSvcVideoUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Quórum mín. personas</Label>
                    <Input
                      type="number"
                      value={svcMinPeople}
                      onChange={(e) => setSvcMinPeople(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Capacidad máx. personas</Label>
                    <Input
                      type="number"
                      value={svcMaxPeople}
                      onChange={(e) => setSvcMaxPeople(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Descripción completa (Landing + Agente Único)</Label>
                    <Textarea
                      rows={2}
                      value={svcDescription}
                      onChange={(e) => setSvcDescription(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Texto específico / Condiciones</Label>
                    <Input
                      value={svcTextoEspecifico}
                      onChange={(e) => setSvcTextoEspecifico(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  disabled={!canManage || isPending || !svcName.trim()}
                  className="w-full bg-amber-800 hover:bg-amber-900"
                  onClick={() => {
                    startTransition(async () => {
                      await upsertCatalogServiceAction({
                        id: editingCatalogServiceId,
                        name: svcName,
                        category: svcCategory,
                        serviceType: svcType,
                        durationMin: Number(svcDuration) || 80,
                        price: Number(svcPrice) || 0,
                        description: svcDescription,
                        eventDatesText: svcEventDatesText || null,
                        scheduleText: svcScheduleText || null,
                        sinfechadefinitiva: svcSinFecha,
                        textosinfechadefinitiva: svcTextoSinFecha || null,
                        sinpreciodefinitivo: svcSinPrecio,
                        textosinpreciodefinitivo: svcTextoSinPrecio || null,
                        textoespecifico: svcTextoEspecifico || null,
                        flyerUrl: svcFlyerUrl || null,
                        videoUrl: svcVideoUrl || null,
                        minPeople: Number(svcMinPeople) || 1,
                        maxPeople: Number(svcMaxPeople) || 120,
                        active: true,
                        artistId: svcArtistId || null,
                        venueId: svcVenueId || null,
                      })
                      setFeedback(
                        `Servicio «${svcName}» guardado y sincronizado en Agenda, Landing y Agente Único.`,
                      )
                      resetCatalogServiceForm()
                      router.refresh()
                    })
                  }}
                >
                  {editingCatalogServiceId
                    ? "Guardar Cambios en Agenda y Landing"
                    : "Crear Servicio en Agenda y Landing"}
                </Button>
              </div>
            </div>
          )}

          {/* ─── SUB-PESTAÑA b.5: CATÁLOGO PACKS DIGITALES + AGENTE ÚNICO + PASARELA WHATSAPP (EVOLUTION / YCLOUD / META) ─── */}
          {maintSubTab === "servicios_digitales_y_pasarela" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 rounded-xl border bg-white p-5 shadow-xs lg:col-span-6">
                <Badge className="bg-emerald-700 text-white">
                  Pasarela WhatsApp Multiproveedor (Estilo crm_salvadora)
                </Badge>
                <h3 className="text-base font-bold text-stone-900">
                  Selector de Proveedor WhatsApp: Evolution API (Actual) → YCloud / Meta (Paso 2)
                </h3>
                <p className="text-xs text-stone-600">
                  Igual que en <code>crm_salvadora</code>, el canal de WhatsApp trabaja hoy con <strong>Evolution API</strong> y está preparado para conmutar a <strong>YCloud</strong> o <strong>Meta Directo</strong> sin tocar los agentes ni la Agenda. En Instagram se publica el enlace a la Landing Web para despertar reservas hacia estos canales.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Proveedor activo de WhatsApp</Label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm font-semibold"
                      value={waProvider}
                      onChange={(e) =>
                        setWaProvider(e.target.value as "evolution" | "ycloud" | "meta")
                      }
                    >
                      <option value="evolution">Evolution API (Activo · Como en Salvadora)</option>
                      <option value="ycloud">YCloud (Coexistencia · Paso 2)</option>
                      <option value="meta">Meta Cloud API Oficial (Paso 2)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Número WhatsApp de Reservas</Label>
                    <Input value={waNumber} onChange={(e) => setWaNumber(e.target.value)} />
                  </div>

                  {waProvider === "evolution" && (
                    <>
                      <div className="sm:col-span-2">
                        <Label>Evolution API URL</Label>
                        <Input value={evoApiUrl} onChange={(e) => setEvoApiUrl(e.target.value)} />
                      </div>
                      <div>
                        <Label>Nombre de Instancia Evolution</Label>
                        <Input
                          value={evoInstance}
                          onChange={(e) => setEvoInstance(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>
                          Evolution API Key{" "}
                          {snapshot.whatsappGateway.maskedEvolutionApiKey
                            ? `(${snapshot.whatsappGateway.maskedEvolutionApiKey})`
                            : ""}
                        </Label>
                        <Input
                          type="password"
                          value={evoApiKey}
                          onChange={(e) => setEvoApiKey(e.target.value)}
                          placeholder="Dejar en blanco para mantener actual"
                        />
                      </div>
                    </>
                  )}

                  {waProvider === "ycloud" && (
                    <div className="sm:col-span-2">
                      <Label>YCloud API Key</Label>
                      <Input
                        type="password"
                        value={ycloudApiKey}
                        onChange={(e) => setYcloudApiKey(e.target.value)}
                        placeholder="Clave secreta de YCloud"
                      />
                    </div>
                  )}

                  {waProvider === "meta" && (
                    <>
                      <div>
                        <Label>Meta Phone Number ID</Label>
                        <Input
                          value={metaPhoneId}
                          onChange={(e) => setMetaPhoneId(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Meta WABA ID</Label>
                        <Input
                          value={metaWabaId}
                          onChange={(e) => setMetaWabaId(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Meta Access Token Permanente</Label>
                        <Input
                          type="password"
                          value={metaToken}
                          onChange={(e) => setMetaToken(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800">
                      <input
                        type="checkbox"
                        checked={emailAutoBookingEnabled}
                        onChange={(e) => setEmailAutoBookingEnabled(e.target.checked)}
                      />
                      Activar Evaluador IA de Auto-Reservas en Correo Entrante (AUTO_BOOKING)
                    </label>
                  </div>
                </div>

                <Button
                  disabled={!canManage || isPending}
                  className="w-full bg-amber-800 hover:bg-amber-900"
                  onClick={() => {
                    startTransition(async () => {
                      await updateWhatsappGatewayAction({
                        provider: waProvider,
                        whatsappNumber: waNumber,
                        evolutionApiUrl: evoApiUrl,
                        evolutionInstanceName: evoInstance,
                        evolutionApiKey: evoApiKey || null,
                        ycloudApiKey: ycloudApiKey || null,
                        metaPhoneNumberId: metaPhoneId || null,
                        metaWabaId: metaWabaId || null,
                        metaAccessToken: metaToken || null,
                        emailAutoBookingEnabled,
                      })
                      setFeedback(
                        `Pasarela WhatsApp (${waProvider.toUpperCase()}) y número ${waNumber} actualizados.`,
                      )
                      router.refresh()
                    })
                  }}
                >
                  Guardar Configuración de Pasarela Omnicanal
                </Button>
              </div>

              {/* Agente Único + Catálogo de Packs Digitales */}
              <div className="space-y-4 rounded-xl border bg-white p-5 shadow-xs lg:col-span-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-amber-800 text-white">
                      Agente Único Sincronizado (Cero Duplicidad)
                    </Badge>
                    <h3 className="mt-1 text-base font-bold text-stone-900">
                      {snapshot.unifiedAgent?.name ||
                        "Agente Único de Atención y Reservas · Soniquete Flamenco"}
                    </h3>
                  </div>
                  <Link href="/agentes">
                    <Button size="sm" variant="outline">
                      Ver en Agentes
                    </Button>
                  </Link>
                </div>

                <p className="text-xs text-stone-600">
                  En lugar de mantener varios agentes con instrucciones repetidas, este único agente lee en vivo la tabla unificada de Servicios, Conciertos e Intérpretes y atiende simultáneamente Landing, WhatsApp, Telegram, VAPI y Email:
                </p>

                <pre className="max-h-48 overflow-auto rounded-lg border bg-stone-900 p-3 text-[11px] text-amber-100 whitespace-pre-wrap">
                  {snapshot.unifiedAgent?.instructions ||
                    "Catálogo unificado sincronizado con la Agenda."}
                </pre>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-bold text-stone-900">
                    Plantillas Maestras de Packs de Servicios Digitales para Artistas:
                  </p>
                  <div className="grid gap-2">
                    {snapshot.digitalPackPresets.map((preset) => (
                      <div
                        key={preset.packName}
                        className="rounded-lg border bg-stone-50 p-2.5 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-semibold text-stone-900">{preset.packName}</p>
                          <p className="text-[11px] text-stone-600">{preset.description}</p>
                        </div>
                        <Badge variant="outline">
                          Alta {preset.setupFeeEur} € · {preset.monthlyFeeEur} €/mes
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
          SECCIÓN c) CONCIERTOS, EVENTOS Y RESERVAS PROVISIONALES (Búsqueda + ABM + Quórum + Aviso + Contratos)
      ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
      {mainSection === "c_conciertos" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
                <Input
                  value={searchConcerts}
                  onChange={(e) => setSearchConcerts(e.target.value)}
                  placeholder="Buscar concierto, viaje flamenco, conferencia, intérprete o sala..."
                  className="pl-9 text-sm"
                />
              </div>
              <Badge variant="secondary">{filteredConcerts.length} eventos</Badge>
            </div>

            {filteredConcerts.map((c) => {
              const artist = snapshot.artists.find((a) => a.id === c.artistId)
              const venue = snapshot.venues.find((v) => v.id === c.venueId)
              const provBookings = snapshot.provisionalBookings.filter(
                (b) => b.concertId === c.id,
              )
              const belowMin =
                c.cancelIfBelowMinAttendees &&
                c.minAttendees > 0 &&
                c.currentAttendees < c.minAttendees

              return (
                <div
                  key={c.id}
                  className={`rounded-xl border bg-white p-5 shadow-xs space-y-3 ${
                    editingConcertId === c.id ? "ring-2 ring-amber-600" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {EVENT_KIND_LABELS[c.eventKind as EventKind] ?? c.eventKind}
                        </Badge>
                        <h4 className="text-base font-bold text-stone-900">{c.title}</h4>
                        <Badge>{CONCERT_STATUS_LABELS[c.status] ?? c.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-stone-600">
                        <strong>Intérprete:</strong> {artist?.artisticName ?? "Artista"} ·{" "}
                        <strong>Lugar:</strong>{" "}
                        {c.dateAndPlaceTbd
                          ? "Fecha y lugar por definir (Reservas provisionales)"
                          : `${venue?.name ?? "Sala"} · ${new Date(c.startsAt).toLocaleDateString("es-ES")} (${c.showTime} h)`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        onClick={() => loadConcertForEdit(c)}
                      >
                        <Edit3 className="size-3.5" /> Modificar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canManage || isPending}
                        className="h-8 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          startTransition(async () => {
                            await deleteConcertAction(c.id)
                            if (editingConcertId === c.id) resetConcertForm()
                            setFeedback(`Evento «${c.title}» eliminado de Conciertos y Agenda.`)
                            router.refresh()
                          })
                        }}
                      >
                        <Trash2 className="size-3.5" /> Baja
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-stone-600">
                    <span>💶 Caché: {c.agreedCacheEur} €</span>
                    <span>🎟 Entrada: {c.ticketPriceEur} €</span>
                    <span>🎸 Guitarra: {c.guitaristName || "Titular"}</span>
                    <span>
                      👥 Asistentes: {c.currentAttendees} / mín. {c.minAttendees}
                    </span>
                  </div>

                  {belowMin && c.status !== "cancelado" && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="size-4 text-amber-700" />
                        Quórum actual ({c.currentAttendees}) inferior al mínimo ({c.minAttendees}).
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-white"
                        onClick={() => {
                          startTransition(async () => {
                            const res = await evaluateMinAttendeesAction(c.id)
                            setFeedback(res.message)
                            router.refresh()
                          })
                        }}
                      >
                        Evaluar Quórum
                      </Button>
                    </div>
                  )}

                  {(c.dateAndPlaceTbd || c.provisionalBookingsOpen || provBookings.length > 0) && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-purple-950">
                          Reservas Provisionales ({provBookings.length})
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            className="rounded border bg-white px-2 py-1 text-xs"
                            value={confirmVenueForEventId}
                            onChange={(e) => setConfirmVenueForEventId(e.target.value)}
                          >
                            {snapshot.venues.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="datetime-local"
                            value={confirmDateForEventIso}
                            onChange={(e) => setConfirmDateForEventIso(e.target.value)}
                            className="h-7 w-44 bg-white text-xs"
                          />
                          <Button
                            size="sm"
                            className="h-7 bg-purple-700 text-xs hover:bg-purple-800"
                            onClick={() => {
                              startTransition(async () => {
                                const res = await notifyProvisionalBookingsAction({
                                  concertId: c.id,
                                  confirmedVenueId: confirmVenueForEventId,
                                  confirmedStartsAtIso: new Date(
                                    confirmDateForEventIso,
                                  ).toISOString(),
                                })
                                setFeedback(
                                  `Fijada fecha (${res.dateLabel}) en ${res.placeLabel}. Enviado aviso a ${res.notifiedCount} reserva(s) provisionales.`,
                                )
                                router.refresh()
                              })
                            }}
                          >
                            <BellRing className="mr-1 size-3" /> Confirmar Fecha y Avisar
                          </Button>
                        </div>
                      </div>

                      {provBookings.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between rounded border bg-white px-2.5 py-1.5"
                        >
                          <span>
                            <strong>{b.attendeeName}</strong> ({b.seats} plazas) · {b.attendeePhone} ·{" "}
                            <Badge variant="outline" className="text-[10px]">
                              {b.status}
                            </Badge>
                          </span>
                          {b.status !== "confirmada" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px]"
                              onClick={() => {
                                startTransition(async () => {
                                  await confirmProvisionalBookingAction(b.id)
                                  setFeedback(`Reserva de ${b.attendeeName} confirmada.`)
                                  router.refresh()
                                })
                              }}
                            >
                              Confirmar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Formulario Alta/Modificación de Evento + Reserva Provisional + Contrato */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">
                  {editingConcertId
                    ? "Modificar Concierto o Evento"
                    : "Alta de Concierto / Evento (Se sincroniza en Agenda)"}
                </h3>
                {editingConcertId && (
                  <Button size="sm" variant="ghost" onClick={resetConcertForm}>
                    <X className="mr-1 size-3.5" /> Cancelar
                  </Button>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <Label>Tipo de Evento</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
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
                  <Label>Estado</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={concertStatus}
                    onChange={(e) =>
                      setConcertStatus(
                        e.target.value as
                          | "propuesta"
                          | "provisional"
                          | "negociacion"
                          | "confirmado"
                          | "celebrado"
                          | "cancelado",
                      )
                    }
                  >
                    {Object.entries(CONCERT_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Título del evento *</Label>
                  <Input
                    value={concertTitle}
                    onChange={(e) => setConcertTitle(e.target.value)}
                    placeholder="Ej. Recital Cante Jondo o Viaje Cultural a Jerez"
                  />
                </div>
                <div>
                  <Label>Intérprete</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
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
                  <Label>Sala / Lugar</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={concertVenueId}
                    onChange={(e) => setConcertVenueId(e.target.value)}
                    disabled={dateAndPlaceTbd}
                  >
                    <option value="">Por definir</option>
                    {snapshot.venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-purple-950">
                    <input
                      type="checkbox"
                      checked={dateAndPlaceTbd}
                      onChange={(e) => {
                        setDateAndPlaceTbd(e.target.checked)
                        if (e.target.checked) setProvisionalBookingsOpen(true)
                      }}
                    />
                    Fecha y lugar aún por definir (abrir reservas provisionales con aviso)
                  </label>
                </div>
                <div>
                  <Label>Fecha y hora</Label>
                  <Input
                    type="datetime-local"
                    value={concertDateIso}
                    onChange={(e) => setConcertDateIso(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Guitarra</Label>
                  <Input
                    value={concertGuitarist}
                    onChange={(e) => setConcertGuitarist(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Caché sala (€)</Label>
                  <Input
                    type="number"
                    value={concertCache}
                    onChange={(e) => setConcertCache(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Precio entrada (€)</Label>
                  <Input
                    type="number"
                    value={concertTicket}
                    onChange={(e) => setConcertTicket(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Quórum mínimo</Label>
                  <Input
                    type="number"
                    value={minAttendees}
                    onChange={(e) => setMinAttendees(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Inscritos actuales</Label>
                  <Input
                    type="number"
                    value={currentAttendees}
                    onChange={(e) => setCurrentAttendees(e.target.value)}
                  />
                </div>
              </div>

              <Button
                disabled={!canManage || isPending || !concertTitle.trim()}
                className="w-full bg-amber-800 hover:bg-amber-900"
                onClick={() => {
                  startTransition(async () => {
                    const payload = {
                      id: editingConcertId ?? undefined,
                      title: concertTitle,
                      eventKind,
                      artistId: concertArtistId,
                      venueId: dateAndPlaceTbd ? null : concertVenueId || null,
                      startsAtIso: new Date(concertDateIso).toISOString(),
                      dateAndPlaceTbd,
                      provisionalBookingsOpen: dateAndPlaceTbd ? true : provisionalBookingsOpen,
                      autoNotifyToConfirm,
                      cancelIfBelowMinAttendees,
                      minAttendees: Number(minAttendees) || 0,
                      currentAttendees: Number(currentAttendees) || 0,
                      agreedCacheEur: Number(concertCache) || 2200,
                      ticketPriceEur: Number(concertTicket) || 25,
                      guitaristName: concertGuitarist,
                      status: concertStatus,
                      notes: concertNotes || null,
                      createCalcomMeeting: !editingConcertId,
                      generateStandardMediaPack: !editingConcertId,
                    }
                    if (editingConcertId) {
                      await updateConcertAction(payload)
                      setFeedback(
                        `Evento «${concertTitle}» actualizado y sincronizado en la Agenda.`,
                      )
                    } else {
                      await createConcertAction(payload)
                      setFeedback(
                        `Evento «${concertTitle}» creado y añadido automáticamente a la Agenda y Landing.`,
                      )
                    }
                    resetConcertForm()
                    router.refresh()
                  })
                }}
              >
                {editingConcertId
                  ? "Guardar Cambios del Evento"
                  : "Crear Evento y Sincronizar con Agenda"}
              </Button>
            </div>

            {/* Registrar Reserva Provisional Manual */}
            <div className="rounded-xl border bg-white p-5 shadow-xs space-y-2.5">
              <h3 className="text-sm font-bold text-stone-900">
                Registrar Reserva Provisional de Asistente
              </h3>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={provConcertId}
                onChange={(e) => setProvConcertId(e.target.value)}
              >
                {snapshot.concerts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <Input
                value={provAttendeeName}
                onChange={(e) => setProvAttendeeName(e.target.value)}
                placeholder="Nombre del interesado *"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={provAttendeePhone}
                  onChange={(e) => setProvAttendeePhone(e.target.value)}
                  placeholder="Teléfono (+34...)"
                />
                <Input
                  type="number"
                  value={provSeats}
                  onChange={(e) => setProvSeats(e.target.value)}
                  placeholder="Plazas"
                />
              </div>
              <Button
                size="sm"
                disabled={!canManage || isPending || !provAttendeeName.trim()}
                className="w-full"
                onClick={() => {
                  startTransition(async () => {
                    await createProvisionalBookingAction({
                      concertId: provConcertId,
                      attendeeName: provAttendeeName,
                      attendeeEmail: null,
                      attendeePhone: provAttendeePhone || null,
                      seats: Number(provSeats) || 1,
                      notes: null,
                    })
                    setProvAttendeeName("")
                    setFeedback("Reserva provisional registrada.")
                    router.refresh()
                  })
                }}
              >
                Guardar Reserva Provisional
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
          SECCIÓN d) SIMULADOR DE OFERTAS → MÓDULO DE ENVÍOS
      ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
      {mainSection === "d_simulador" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {snapshot.concertOffers.map((offer) => (
              <div key={offer.id} className="rounded-xl border bg-white p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-stone-900">{offer.title}</h4>
                    <p className="text-xs text-stone-500">
                      Fecha propuesta: {offer.proposedDateText} · Caché: {offer.proposedCacheEur} €
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-white">{offer.status}</Badge>
                    <Link href="/envios">
                      <Button size="sm" variant="outline">
                        Abrir en Envíos
                      </Button>
                    </Link>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap rounded-lg border bg-stone-50 p-3 text-xs text-stone-700">
                  {offer.whatsappPreview}
                </pre>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3 lg:col-span-5">
            <h3 className="text-base font-bold text-stone-900">
              d · Simular Oferta con Pack de Vídeos y Pasar a Envíos
            </h3>
            <div className="space-y-2.5">
              <div>
                <Label>Título de la propuesta</Label>
                <Input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} />
              </div>
              <div>
                <Label>Intérprete</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
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
                <Label>Sala destinataria (o todas las de su tipo)</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={offerVenueId}
                  onChange={(e) => setOfferVenueId(e.target.value)}
                >
                  <option value="">Todas las salas del segmento</option>
                  {snapshot.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.city})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Fecha propuesta</Label>
                  <Input value={offerDateText} onChange={(e) => setOfferDateText(e.target.value)} />
                </div>
                <div>
                  <Label>Caché (€)</Label>
                  <Input
                    type="number"
                    value={offerCache}
                    onChange={(e) => setOfferCache(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Button
              disabled={!canManage || isPending}
              className="w-full bg-amber-800 hover:bg-amber-900"
              onClick={() => {
                startTransition(async () => {
                  await simulateConcertOfferAction({
                    title: offerTitle,
                    artistId: offerArtistId,
                    venueId: offerVenueId || null,
                    targetVenueKind: "sala_flamenco",
                    proposedDateText: offerDateText,
                    proposedCacheEur: Number(offerCache) || 2400,
                    includesGroup: true,
                    guitaristName: "Diego del Morón",
                    channels: ["whatsapp", "telegram", "email"],
                    createCampaignInEnvios: true,
                  })
                  setFeedback("Oferta simulada y programada en el módulo de Envíos.")
                  router.refresh()
                })
              }}
            >
              Simular Oferta y Programar en Envíos
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
          SECCIÓN e) CAPTAR SALAS / ARTISTAS DE LA WEB
      ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
      {mainSection === "e_captar_web" && (
        <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6 shadow-xs space-y-4">
          <Badge className="bg-amber-700 text-white">e · Captación Automática desde Web</Badge>
          <h3 className="text-lg font-bold text-stone-900">
            Extraer Sala, Tablao, Ateneo o Intérprete desde su URL Oficial
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>¿Qué quieres captar?</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={scrapeTargetType}
                onChange={(e) => setScrapeTargetType(e.target.value as "venue" | "artist")}
              >
                <option value="venue">Sala / Tablao / Ateneo / Ayuntamiento</option>
                <option value="artist">Artista Flamenco (para ofrecerle Pack Digital 360º)</option>
              </select>
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={scrapeCity} onChange={(e) => setScrapeCity(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>URL del sitio web *</Label>
              <Input value={scrapeUrl} onChange={(e) => setScrapeUrl(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Nombre opcional</Label>
              <Input
                value={scrapeFallbackName}
                onChange={(e) => setScrapeFallbackName(e.target.value)}
              />
            </div>
          </div>
          <Button
            disabled={!canManage || isPending || !scrapeUrl.trim()}
            className="w-full bg-amber-800 hover:bg-amber-900"
            onClick={() => {
              startTransition(async () => {
                const res = await scrapeWebEntityAction({
                  targetType: scrapeTargetType,
                  websiteUrl: scrapeUrl,
                  fallbackName: scrapeFallbackName || null,
                  fallbackCity: scrapeCity,
                  venueKind: "tablao",
                })
                setFeedback(`Captado desde web: «${res.name}» (${res.email}).`)
                router.refresh()
              })
            }}
          >
            Extraer Datos de la Web e Incorporar al Maestro
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
          SECCIÓN f) SERVICIOS DIGITALES A ARTISTAS (Búsqueda + Alta + Modificación + Baja)
      ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */}
      {mainSection === "f_servicios_artistas" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
                <Input
                  value={searchDigitalServices}
                  onChange={(e) => setSearchDigitalServices(e.target.value)}
                  placeholder="Buscar servicio digital por artista, pack o dominio..."
                  className="pl-9 text-sm"
                />
              </div>
              <Badge variant="secondary">{filteredDigitalServices.length} packs activos</Badge>
            </div>

            {filteredDigitalServices.map((ds) => {
              const artist = snapshot.artists.find((a) => a.id === ds.artistId)
              return (
                <div
                  key={ds.id}
                  className={`rounded-xl border bg-white p-5 shadow-xs space-y-2 ${
                    editingDigitalServiceId === ds.id ? "ring-2 ring-amber-600" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-900">{ds.packName}</h4>
                        <Badge className="bg-emerald-600 text-white">{ds.status}</Badge>
                      </div>
                      <p className="text-xs text-stone-500">
                        Artista: <strong>{artist?.artisticName ?? "Intérprete"}</strong> · Dominio:{" "}
                        {ds.landingDomain || "En configuración"} · Alta: {ds.setupFeeEur} € +{" "}
                        {ds.monthlyFeeEur} €/mes
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        onClick={() => loadDigitalServiceForEdit(ds)}
                      >
                        <Edit3 className="size-3.5" /> Modificar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canManage || isPending}
                        className="h-8 gap-1 border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          startTransition(async () => {
                            await deleteArtistDigitalServiceAction(ds.id)
                            if (editingDigitalServiceId === ds.id) resetDigitalServiceForm()
                            setFeedback(`Pack «${ds.packName}» eliminado.`)
                            router.refresh()
                          })
                        }}
                      >
                        <Trash2 className="size-3.5" /> Baja
                      </Button>
                    </div>
                  </div>
                  {ds.stripePaymentLinkUrl && (
                    <a
                      href={ds.stripePaymentLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                    >
                      Pasarela de pago Stripe/Bizum
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-xs space-y-3 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                {editingDigitalServiceId
                  ? "Modificar Pack Digital de Artista"
                  : "Alta de Pack Digital 360º para Artista"}
              </h3>
              {editingDigitalServiceId && (
                <Button size="sm" variant="ghost" onClick={resetDigitalServiceForm}>
                  <X className="mr-1 size-3.5" /> Cancelar
                </Button>
              )}
            </div>

            <div className="space-y-2.5">
              <div>
                <Label>Artista destinatario</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={packArtistId}
                  onChange={(e) => setPackArtistId(e.target.value)}
                >
                  {snapshot.artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.artisticName}
                    </option>
                  ))}
                </select>
              </div>
              {!editingDigitalServiceId && (
                <div>
                  <Label>Plantilla de Pack</Label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={packPresetIdx}
                    onChange={(e) => {
                      const idx = Number(e.target.value)
                      setPackPresetIdx(idx)
                      const p = snapshot.digitalPackPresets[idx]
                      if (p) {
                        setPackSetupEur(String(p.setupFeeEur))
                        setPackMonthlyEur(String(p.monthlyFeeEur))
                      }
                    }}
                  >
                    {snapshot.digitalPackPresets.map((p, idx) => (
                      <option key={p.packName} value={idx}>
                        {p.packName} ({p.setupFeeEur} € + {p.monthlyFeeEur} €/mes)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Nombre personalizado del Pack</Label>
                <Input
                  value={packCustomName}
                  onChange={(e) => setPackCustomName(e.target.value)}
                  placeholder={snapshot.digitalPackPresets[packPresetIdx]?.packName}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={packStatus}
                  onChange={(e) =>
                    setPackStatus(
                      e.target.value as
                        | "propuesta"
                        | "activo"
                        | "en_produccion"
                        | "entregado"
                        | "pausado",
                    )
                  }
                >
                  <option value="propuesta">Propuesta</option>
                  <option value="en_produccion">En producción</option>
                  <option value="activo">Activo</option>
                  <option value="entregado">Entregado</option>
                  <option value="pausado">Pausado</option>
                </select>
              </div>
              <div>
                <Label>Dominio de la Landing del Artista</Label>
                <Input value={packDomain} onChange={(e) => setPackDomain(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Alta inicial (€)</Label>
                  <Input
                    type="number"
                    value={packSetupEur}
                    onChange={(e) => setPackSetupEur(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Cuota mensual (€)</Label>
                  <Input
                    type="number"
                    value={packMonthlyEur}
                    onChange={(e) => setPackMonthlyEur(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              disabled={!canManage || isPending}
              className="w-full bg-amber-800 hover:bg-amber-900"
              onClick={() => {
                startTransition(async () => {
                  const preset =
                    snapshot.digitalPackPresets[packPresetIdx] ?? snapshot.digitalPackPresets[0]
                  const payload = {
                    id: editingDigitalServiceId ?? undefined,
                    artistId: packArtistId,
                    packName: packCustomName.trim() || preset.packName,
                    status: packStatus,
                    includesLanding: true,
                    landingDomain: packDomain,
                    includesAiAgent: true,
                    includesWhatsappChannel: true,
                    includesTelegramBot: true,
                    includesInstagramSetup: true,
                    includesYoutubeChannel: true,
                    includesNineVideosPack: true,
                    setupFeeEur: Number(packSetupEur) || preset.setupFeeEur,
                    monthlyFeeEur: Number(packMonthlyEur) || preset.monthlyFeeEur,
                    notes: packNotes || preset.description,
                  }
                  if (editingDigitalServiceId) {
                    await updateArtistDigitalServiceAction(payload)
                    setFeedback("Pack digital actualizado.")
                  } else {
                    await createArtistDigitalServiceAction(payload)
                    setFeedback("Pack digital creado con enlace de pago Stripe/Bizum.")
                  }
                  resetDigitalServiceForm()
                  router.refresh()
                })
              }}
            >
              {editingDigitalServiceId
                ? "Guardar Cambios del Pack Digital"
                : "Activar Pack Digital + Link de Pago"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
