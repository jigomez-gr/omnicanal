"use client";

import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  ImageIcon,
  Layers,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react";
import { useState, useTransition, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceItem } from "@/data/agenda-config";
import type { ActionFailure } from "@/lib/action-result";
import type { AgendaMode, ResourceColor } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { ColorDot } from "../../_components/color-dot";
import { capitalize } from "../../_lib/labels";
import { saveServiceAction } from "../actions";
import {
  ADVANCE_UNIT_LABELS,
  ADVANCE_UNITS,
  advanceToMinutes,
  minutesToAdvance,
  parseNumberField,
  serviceWarnings,
  type AdvanceUnit,
} from "../_lib/service-form";

export type ResourceChoice = { id: string; name: string; color: ResourceColor; capacity: number; active: boolean };
/** The business's words ([AGD-01]): «cita»/«reserva» and «profesionales»/«mesas»… */
export type ServiceWords = { booking: string; resources: string };

type ServiceFormProps = {
  service: ServiceItem | null;
  resources: ResourceChoice[];
  mode: AgendaMode;
  words: ServiceWords;
  onDone: () => void;
};

const textVal = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const isAdvanceUnit = (value: string): value is AdvanceUnit => (ADVANCE_UNITS as readonly string[]).includes(value);

/** Helper for media display URLs (detects relative vs absolute vs fallback). */
function getDisplayUrl(url?: string | null, path?: string | null): string {
  if (url && url.trim()) return url.trim();
  if (path && path.trim()) {
    const p = path.trim();
    if (p.startsWith("public/")) return p.replace(/^public/, "");
    if (p.startsWith("/")) return p;
    return `/${p}`;
  }
  return "";
}

/** Creates or edits a service with all parameters ported from crm_salvadora and omnicanal, organized by blocks. */
export function ServiceForm({ service, resources, mode, words, onDone }: ServiceFormProps) {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  // Bloque 1: Modalidad y Horarios
  const [serviceType, setServiceType] = useState<"recurring" | "event">(
    service?.serviceType === "event" ? "event" : "recurring",
  );
  const [sinFechaDefinitiva, setSinFechaDefinitiva] = useState(service?.sinfechadefinitiva ?? false);

  // Bloque 2: Información Específica y Descripción
  const [textoEspecifico, setTextoEspecifico] = useState(service?.textoespecifico ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [descriptionForAgent, setDescriptionForAgent] = useState(service?.descriptionForAgent ?? "");

  // Bloque 3: Material Multimedia
  const [flyerPath, setFlyerPath] = useState(service?.flyerPath ?? "");
  const [flyerUrl, setFlyerUrl] = useState(service?.flyerUrl ?? "");
  const [videoPath, setVideoPath] = useState(service?.videoPath ?? "");
  const [videoUrl, setVideoUrl] = useState(service?.videoUrl ?? "");
  const [flyerParticularPath, setFlyerParticularPath] = useState(service?.flyerParticularPath ?? "");
  const [flyerParticularUrl, setFlyerParticularUrl] = useState(service?.flyerParticularUrl ?? "");
  const [videoParticularPath, setVideoParticularPath] = useState(service?.videoParticularPath ?? "");
  const [videoParticularUrl, setVideoParticularUrl] = useState(service?.videoParticularUrl ?? "");

  // Bloque 4: Fechas Vigencia, Aforo y Quórum
  const [fechaDesde, setFechaDesde] = useState(service?.fechaDesde ?? "2000-01-01");
  const [fechaHasta, setFechaHasta] = useState(service?.fechaHasta ?? "2099-12-31");
  const [maxPeople, setMaxPeople] = useState(String(service?.maxPeople ?? 1));

  // Bloque 5: Precios y Forma de Cobro
  const [sinPrecioDefinitivo, setSinPrecioDefinitivo] = useState(service?.sinpreciodefinitivo ?? false);
  const [paymentType, setPaymentType] = useState<"stripe" | "external_url" | "in_person" | "free">(
    (service?.paymentType as "stripe" | "external_url" | "in_person" | "free") ?? "in_person",
  );

  // Bloque 6: Recursos, Calendario y Modalidades
  const [resourceIds, setResourceIds] = useState<string[]>(service?.resourceIds ?? []);
  const [calendarId, setCalendarId] = useState(service?.calendarId ?? "default");
  const [allowedModalities, setAllowedModalities] = useState<string[]>(
    service?.allowedModalities && service.allowedModalities.length > 0
      ? service.allowedModalities
      : ["in_person"],
  );
  const [requiresReason, setRequiresReason] = useState(service?.requiresReason ?? false);

  // Bloque 7: Duración y Antelación
  const [advanceUnit, setAdvanceUnit] = useState<AdvanceUnit>(minutesToAdvance(service?.minAdvanceMin ?? 0).unit);

  // Bloque 8: Notificaciones y Recordatorios Previos
  const [reminderNotes, setReminderNotes] = useState(service?.reminderNotes ?? "");
  const [notifyByEmail, setNotifyByEmail] = useState(service?.notifyByEmail ?? true);
  const [notifyByWhatsapp, setNotifyByWhatsapp] = useState(service?.notifyByWhatsapp ?? true);
  const [notifyBySms, setNotifyBySms] = useState(service?.notifyBySms ?? false);
  const [notifyByTelegram, setNotifyByTelegram] = useState(service?.notifyByTelegram ?? true);
  const [reminderWhatsapp, setReminderWhatsapp] = useState(service?.reminderWhatsapp ?? true);
  const [reminderEmail, setReminderEmail] = useState(service?.reminderEmail ?? true);
  const [reminderVoice, setReminderVoice] = useState(service?.reminderVoice ?? false);
  const [reminderSms, setReminderSms] = useState(service?.reminderSms ?? false);
  const [reminderHoursEnabled, setReminderHoursEnabled] = useState(service?.reminderHoursEnabled ?? true);
  const [reminderHours, setReminderHours] = useState(String(service?.reminderHours ?? 24));
  const [reminderMinutesEnabled, setReminderMinutesEnabled] = useState(service?.reminderMinutesEnabled ?? true);
  const [reminderMinutes, setReminderMinutes] = useState(String(service?.reminderMinutes ?? 120));

  // Bloque 9: Estado y Aprobación
  const [manual, setManual] = useState(service?.requiresManualConfirmation ?? false);
  const [active, setActive] = useState(service?.active ?? true);

  const errors = failure?.fieldErrors;
  const capacityMode = mode === "capacity";
  const doers = capitalize(words.resources);
  const warnings = serviceWarnings({
    maxPeople: Number(maxPeople) || 1,
    resources: resources.filter((resource) => resourceIds.includes(resource.id)),
  });

  function toggleResource(id: string, checked: boolean) {
    setResourceIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));
  }

  function toggleModality(mod: string, checked: boolean) {
    setAllowedModalities((cur) => (checked ? [...cur, mod] : cur.filter((m) => m !== mod)));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      ...(service ? { serviceId: service.id } : {}),
      name: textVal(data, "name"),
      category: textVal(data, "category") || null,
      durationMin: parseNumberField(textVal(data, "durationMin")),
      bufferBeforeMin: parseNumberField(textVal(data, "bufferBeforeMin")) ?? 0,
      bufferAfterMin: parseNumberField(textVal(data, "bufferAfterMin")) ?? 0,
      price: sinPrecioDefinitivo ? null : parseNumberField(textVal(data, "price")),
      descriptionForAgent: descriptionForAgent || null,
      resourceIds,
      minPeople: parseNumberField(textVal(data, "minPeople")) ?? 1,
      maxPeople: parseNumberField(maxPeople) ?? 1,
      minAdvanceMin: advanceToMinutes(textVal(data, "minAdvance"), advanceUnit),
      maxAdvanceDays: parseNumberField(textVal(data, "maxAdvanceDays")),
      requiresManualConfirmation: manual,
      active,
      sortOrder: parseNumberField(textVal(data, "sortOrder")) ?? 0,
      serviceType,
      description: description || null,
      eventDatesText: textVal(data, "eventDatesText") || null,
      scheduleText: textVal(data, "scheduleText") || null,
      flyerUrl: flyerUrl || null,
      flyerPath: flyerPath || null,
      flyerParticularUrl: flyerParticularUrl || null,
      flyerParticularPath: flyerParticularPath || null,
      videoUrl: videoUrl || null,
      videoPath: videoPath || null,
      videoParticularUrl: videoParticularUrl || null,
      videoParticularPath: videoParticularPath || null,
      textoespecifico: textoEspecifico || null,
      fechaDesde: fechaDesde || "2000-01-01",
      fechaHasta: fechaHasta || "2099-12-31",
      sinfechadefinitiva: sinFechaDefinitiva,
      textosinfechadefinitiva: textVal(data, "textosinfechadefinitiva") || null,
      sinpreciodefinitivo: sinPrecioDefinitivo,
      textosinpreciodefinitivo: textVal(data, "textosinpreciodefinitivo") || null,
      paymentType,
      externalPaymentUrl: textVal(data, "externalPaymentUrl") || null,
      allowedModalities,
      requiresReason,
      calEventTypeId: textVal(data, "calEventTypeId") || null,
      reminderNotes: reminderNotes || null,
      notifyByEmail,
      notifyByWhatsapp,
      notifyBySms,
      notifyByTelegram,
      calendarId: calendarId || "default",
      minQuorum: parseNumberField(textVal(data, "minQuorum")),
      reminderWhatsapp,
      reminderEmail,
      reminderVoice,
      reminderSms,
      reminderHoursEnabled,
      reminderHours: Number(reminderHours) || 24,
      reminderMinutesEnabled,
      reminderMinutes: Number(reminderMinutes) || 120,
    };

    startTransition(async () => {
      const result = await saveServiceAction(input);
      if (!result.ok) {
        setFailure(result);
        return;
      }
      toast.success(result.message ?? "Servicio guardado.");
      onDone();
    });
  }

  const advance = minutesToAdvance(service?.minAdvanceMin ?? 0);
  const dispFlyerGeneral = getDisplayUrl(flyerUrl, flyerPath);
  const dispVideoGeneral = getDisplayUrl(videoUrl, videoPath);
  const dispFlyerParticular = getDisplayUrl(flyerParticularUrl, flyerParticularPath);
  const dispVideoParticular = getDisplayUrl(videoParticularUrl, videoParticularPath);

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 p-4 text-sm pb-10">
      {/* ─── BLOQUE 1: MODALIDAD Y HORARIOS OFICIALES ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Calendar className="size-4 text-primary" />
          <h3 className="font-semibold text-foreground">Bloque 1: Modalidad y Horarios Oficiales</h3>
        </div>

        <div>
          <Label className="text-xs font-medium mb-1.5 block">Modalidad del Servicio</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setServiceType("recurring")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors",
                serviceType === "recurring"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50",
              )}
            >
              <Calendar className="size-4" />
              Cita periódica habitual
            </button>
            <button
              type="button"
              onClick={() => setServiceType("event")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors",
                serviceType === "event"
                  ? "border-purple-600 bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950/40 dark:text-purple-300"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50",
              )}
            >
              <Compass className="size-4" />
              Viaje / Retiro / Evento
            </button>
          </div>
        </div>

        <TextInput
          name="name"
          label="Nombre del Servicio o Viaje"
          defaultValue={service?.name}
          maxLength={80}
          autoComplete="off"
          errors={errors?.name}
          placeholder="ej. Hatha Yoga Terapéutico o Retiro en la Sierra"
        />

        {serviceType === "recurring" ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 space-y-2 dark:border-sky-900 dark:bg-sky-950/30">
            <TextInput
              name="scheduleText"
              label="Horarios y Turnos Oficiales (Semanales)"
              optional
              defaultValue={service?.scheduleText ?? ""}
              maxLength={1000}
              placeholder="ej. Martes (9:45, 11:15, 17:00, 18:30, 20:00), Miércoles (20:15) y Jueves (9:45, 11:15, 16:00, 17:30, 19:00)"
              errors={errors?.scheduleText}
              help="El asistente de IA, WhatsApp, la web y el calendario utilizarán exactamente estos horarios para validar y ofrecer turnos disponibles."
            />
          </div>
        ) : (
          <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3.5 space-y-3 dark:border-purple-900 dark:bg-purple-950/30">
            <TextInput
              name="eventDatesText"
              label="Fechas del Evento / Viaje"
              optional
              defaultValue={service?.eventDatesText ?? ""}
              maxLength={300}
              placeholder="ej. Del 25 al 28 de Octubre de 2026"
              errors={errors?.eventDatesText}
              help="El agente informará de estas fechas exactas a los clientes que pregunten por el viaje o evento."
            />

            <div className="rounded-md border border-purple-300 bg-background/80 p-3 space-y-2 dark:border-purple-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-purple-950 dark:text-purple-200">
                <Checkbox
                  checked={sinFechaDefinitiva}
                  onCheckedChange={(checked) => setSinFechaDefinitiva(checked === true)}
                />
                <span>Sin fecha definitiva / Fecha por confirmar</span>
              </label>
              {sinFechaDefinitiva && (
                <div className="pt-1.5">
                  <TextInput
                    name="textosinfechadefinitiva"
                    label="Texto descriptivo de la fecha (sustituye a la fecha en web, WhatsApp y VAPI)"
                    defaultValue={service?.textosinfechadefinitiva ?? ""}
                    maxLength={500}
                    placeholder="ej. fechas por confirmar ó primera convocatoria próximamente y segunda en marzo 2027"
                    errors={errors?.textosinfechadefinitiva}
                  />
                  <p className="mt-1 text-xs text-purple-700 dark:text-purple-300">
                    Al no tener fecha definitiva, el agente formalizará la reserva como plaza prioritaria provisional.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ─── BLOQUE 2: INFORMACIÓN ESPECÍFICA Y DESCRIPCIÓN ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Sparkles className="size-4 text-amber-600" />
          <h3 className="font-semibold text-foreground">Bloque 2: Información Específica y Descripción</h3>
        </div>

        {/* Texto Específico del Servicio (Omnicanal) */}
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3.5 space-y-2 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
              <Sparkles className="size-4 text-amber-600" />
              Texto Específico del Servicio (Omnicanal)
            </Label>
            <Badge variant="outline" className="text-[10px] bg-amber-100/90 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 font-semibold">
              Landing • Consultas • Email • WhatsApp • VAPI
            </Badge>
          </div>
          <Textarea
            name="textoespecifico"
            rows={3}
            value={textoEspecifico}
            onChange={(e) => setTextoEspecifico(e.target.value)}
            placeholder="Escribe aquí información específica, condiciones particulares, requisitos de asistencia o textos personalizados que se transmitirán directamente a la landing page, el widget web, las consultas por correo, el agente de WhatsApp y la atención por voz de VAPI..."
            className="text-xs bg-background"
          />
          <p className="text-[11px] text-amber-800 dark:text-amber-300">
            Cualquier cambio guardado aquí se sincroniza al instante en todos los canales interactivos y agentes inteligentes.
          </p>
        </div>

        <FieldFrame
          id="service-description"
          label="Descripción / Condiciones para el cliente"
          optional
          errors={errors?.description}
          help="Indica de qué trata el servicio, detalles de la actividad, qué incluye o requisitos de los asistentes."
        >
          <Textarea
            id="service-description"
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            placeholder="ej. Práctica consciente de asanas, alineación corporal, respiración terapéutica y relajación profunda..."
          />
        </FieldFrame>

        <FieldFrame
          id="service-descriptionForAgent"
          label="Descripción para el agente (instrucciones internas)"
          optional
          errors={errors?.descriptionForAgent}
          help="Qué preguntar antes de reservar o qué avisar al cliente. El agente de IA la lee; el cliente no."
        >
          <Textarea
            id="service-descriptionForAgent"
            name="descriptionForAgent"
            rows={2}
            value={descriptionForAgent}
            onChange={(e) => setDescriptionForAgent(e.target.value)}
            maxLength={1000}
            placeholder="ej. Preguntar si tiene patologías previas de columna y recordar acudir 10 min antes."
          />
        </FieldFrame>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            name="category"
            label="Categoría de Agrupación (Catálogo Web)"
            optional
            defaultValue={service?.category ?? ""}
            maxLength={40}
            placeholder="ej. Clases Regulares de Yoga o Retiros"
            errors={errors?.category}
            help="Agrupa los servicios en el catálogo público y en la agenda."
          />
          <NumberInput
            name="sortOrder"
            label="Orden de prioridad / visualización"
            optional
            defaultValue={service?.sortOrder ?? 0}
            min={0}
            max={10000}
            errors={errors?.sortOrder}
            help="Menor número aparece antes (ej. 1, 2, 3...)."
          />
        </div>
      </section>

      {/* ─── BLOQUE 3: MATERIAL MULTIMEDIA OFICIAL DEL SERVICIO ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-indigo-600" />
            <h3 className="font-semibold text-foreground">Bloque 3: Material Multimedia Oficial del Servicio</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">Vídeos MP4, URLs y flyers</span>
        </div>

        {/* 1. Flyer General */}
        <div className="rounded-lg border p-3 bg-muted/20 space-y-2.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <ImageIcon className="size-3.5 text-indigo-600" />
            1. Flyer General del Servicio
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              name="flyerPath"
              value={flyerPath}
              onChange={(e) => {
                const val = e.target.value;
                setFlyerPath(val);
                if (!flyerUrl && val.startsWith("public/")) setFlyerUrl(val.replace(/^public/, ""));
              }}
              placeholder="Path en disco: public/flyers/yoga.jpeg"
              className="text-xs font-mono"
            />
            <Input
              name="flyerUrl"
              value={flyerUrl}
              onChange={(e) => setFlyerUrl(e.target.value)}
              placeholder="URL servida: /flyers/yoga.jpeg o https://..."
              className="text-xs font-mono"
            />
          </div>
          {Boolean(dispFlyerGeneral) && (
            <div className="flex items-center gap-3 rounded border bg-background p-2">
              <div className="size-12 rounded border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dispFlyerGeneral}
                  alt="Flyer General"
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-medium text-foreground truncate">Vista previa Flyer General</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{dispFlyerGeneral}</p>
              </div>
            </div>
          )}
        </div>

        {/* 2. Vídeo General MP4 */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-3 space-y-2.5 dark:border-purple-900 dark:bg-purple-950/20">
          <div>
            <Label className="text-xs font-semibold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
              <Video className="size-3.5 text-purple-600" />
              2. Vídeo General MP4 del Servicio (Streaming fluido HTTP 206)
            </Label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              name="videoPath"
              value={videoPath}
              onChange={(e) => {
                const val = e.target.value;
                setVideoPath(val);
                if (!videoUrl && val.startsWith("public/")) setVideoUrl(val.replace(/^public/, ""));
              }}
              placeholder="Path en disco: public/videos/itinerario-8.mp4"
              className="text-xs font-mono"
            />
            <Input
              name="videoUrl"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="URL servida: /videos/itinerario-8.mp4 o https://..."
              className="text-xs font-mono"
            />
          </div>
          {Boolean(dispVideoGeneral) && (
            <div className="rounded-md border border-purple-200 bg-neutral-950 p-2 text-white">
              <video
                key={dispVideoGeneral}
                src={dispVideoGeneral}
                controls
                preload="metadata"
                playsInline
                className="w-full max-h-48 rounded bg-black object-contain"
              />
              <div className="mt-1 flex justify-between items-center text-[10px] text-neutral-400 font-mono truncate px-1">
                <span className="truncate">{dispVideoGeneral}</span>
                <span className="text-emerald-400 font-sans shrink-0">✓ Vídeo Activo</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Flyer Particular */}
        <div className="rounded-lg border p-3 bg-muted/20 space-y-2.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <ImageIcon className="size-3.5 text-pink-600" />
            3. Flyer Particular del Servicio
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              name="flyerParticularPath"
              value={flyerParticularPath}
              onChange={(e) => {
                const val = e.target.value;
                setFlyerParticularPath(val);
                if (!flyerParticularUrl && val.startsWith("public/")) setFlyerParticularUrl(val.replace(/^public/, ""));
              }}
              placeholder="Path en disco: public/flyers/particular.jpg"
              className="text-xs font-mono"
            />
            <Input
              name="flyerParticularUrl"
              value={flyerParticularUrl}
              onChange={(e) => setFlyerParticularUrl(e.target.value)}
              placeholder="URL servida: /flyers/particular.jpg o https://..."
              className="text-xs font-mono"
            />
          </div>
          {Boolean(dispFlyerParticular) && (
            <div className="flex items-center gap-3 rounded border bg-background p-2">
              <div className="size-12 rounded border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dispFlyerParticular}
                  alt="Flyer Particular"
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-medium text-foreground truncate">Vista previa Flyer Particular</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{dispFlyerParticular}</p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Vídeo Particular MP4 */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-3 space-y-2.5 dark:border-purple-900 dark:bg-purple-950/20">
          <Label className="text-xs font-semibold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
            <Video className="size-3.5 text-purple-600" />
            4. Vídeo Particular MP4 del Servicio (Prioridad en Catálogo)
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              name="videoParticularPath"
              value={videoParticularPath}
              onChange={(e) => {
                const val = e.target.value;
                setVideoParticularPath(val);
                if (!videoParticularUrl && val.startsWith("public/")) setVideoParticularUrl(val.replace(/^public/, ""));
              }}
              placeholder="Path en disco: media_base/videos/particular.mp4"
              className="text-xs font-mono"
            />
            <Input
              name="videoParticularUrl"
              value={videoParticularUrl}
              onChange={(e) => setVideoParticularUrl(e.target.value)}
              placeholder="URL servida: /videos/particular.mp4 o https://..."
              className="text-xs font-mono"
            />
          </div>
          {Boolean(dispVideoParticular) && (
            <div className="rounded-md border border-purple-200 bg-neutral-950 p-2 text-white">
              <video
                key={dispVideoParticular}
                src={dispVideoParticular}
                controls
                preload="metadata"
                playsInline
                className="w-full max-h-48 rounded bg-black object-contain"
              />
              <div className="mt-1 flex justify-between items-center text-[10px] text-neutral-400 font-mono truncate px-1">
                <span className="truncate">{dispVideoParticular}</span>
                <span className="text-purple-400 font-sans shrink-0">✓ Vídeo Particular Activo</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── BLOQUE 4: FECHAS DE VIGENCIA, AFORO Y QUÓRUM ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Users className="size-4 text-emerald-600" />
          <h3 className="font-semibold text-foreground">Bloque 4: Fechas de Vigencia, Aforo y Quórum</h3>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <Calendar className="size-3.5 text-primary" />
            Fechas de Vigencia / Visualización en Catálogo Público
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Controla el periodo en el que este servicio es visible y ofertado en la web pública. Por defecto: desde 2000-01-01 hasta 2099-12-31.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Fecha Desde (Aparición)</Label>
              <Input
                name="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Fecha Hasta (Fin actividad)</Label>
              <Input
                name="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FieldFrame
            id="service-maxPeople"
            label={capacityMode ? "Aforo por turno / Plazas máx" : "Aforo (Plazas por slot)"}
            errors={errors?.maxPeople}
            help="Cuántas personas pueden reservar el mismo turno (1 para cita 1 a 1, o 20, 30... para clases grupales)."
          >
            <Input
              id="service-maxPeople"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={maxPeople}
              onChange={(event) => setMaxPeople(event.target.value)}
              aria-invalid={errors?.maxPeople ? true : undefined}
              className="tabular-nums"
            />
          </FieldFrame>

          <NumberInput
            name="minQuorum"
            label="Quórum mínimo requerido"
            optional
            defaultValue={service?.minQuorum ?? ""}
            min={1}
            max={5000}
            errors={errors?.minQuorum}
            help="Mínimo de asistentes necesarios para confirmar la viabilidad del grupo."
          />

          <NumberInput
            name="minPeople"
            label={capacityMode ? "Grupo mínimo" : "Personas mínimas"}
            defaultValue={service?.minPeople ?? 1}
            min={1}
            max={500}
            errors={errors?.minPeople}
          />
        </div>

        {warnings.map((warning) => (
          <p key={warning} className="flex items-start gap-2 text-xs text-warning">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {warning}
          </p>
        ))}
      </section>

      {/* ─── BLOQUE 5: PRECIOS Y FORMA DE COBRO ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <CreditCard className="size-4 text-emerald-600" />
          <h3 className="font-semibold text-foreground">Bloque 5: Precios y Forma de Cobro</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <TextInput
              name="price"
              label="Precio (€)"
              optional
              disabled={sinPrecioDefinitivo}
              inputMode="decimal"
              defaultValue={service?.price === null || service?.price === undefined ? "" : String(service.price).replace(".", ",")}
              autoComplete="off"
              errors={errors?.price}
              placeholder="ej. 35.00"
              help="El agente lo da siempre como orientativo si está fijado."
            />
          </div>

          <div className="rounded-md border p-3 bg-muted/20 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
              <Checkbox
                checked={sinPrecioDefinitivo}
                onCheckedChange={(checked) => setSinPrecioDefinitivo(checked === true)}
              />
              <span>Sin precio definitivo / Precio por confirmar o según características</span>
            </label>
            {sinPrecioDefinitivo && (
              <TextInput
                name="textosinpreciodefinitivo"
                label="Texto descriptivo del precio"
                defaultValue={service?.textosinpreciodefinitivo ?? ""}
                maxLength={500}
                placeholder="ej. El precio se determinará en función de las características del viaje y alojamiento."
                errors={errors?.textosinpreciodefinitivo}
              />
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <FieldFrame id="service-paymentType" label="Forma de Cobro / Venta de Entradas" errors={errors?.paymentType}>
            <Select
              value={paymentType}
              onValueChange={(val: "stripe" | "external_url" | "in_person" | "free") => setPaymentType(val)}
            >
              <SelectTrigger id="service-paymentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">Pago presencial en el local</SelectItem>
                <SelectItem value="stripe">Stripe Automático (Tarjetas, Bizum, Apple/Google Pay)</SelectItem>
                <SelectItem value="external_url">Enlace externo (Giglon, Eventbrite, web de entradas...)</SelectItem>
                <SelectItem value="free">Gratuito / Sin cobro</SelectItem>
              </SelectContent>
            </Select>
          </FieldFrame>

          {paymentType === "external_url" && (
            <TextInput
              name="externalPaymentUrl"
              label="URL de venta de entradas / enlace externo"
              defaultValue={service?.externalPaymentUrl ?? ""}
              maxLength={1000}
              placeholder="https://www.giglon.com/evento/..."
              errors={errors?.externalPaymentUrl}
              help="El agente enviará este enlace directamente al cliente para adquirir sus entradas."
            />
          )}
        </div>
      </section>

      {/* ─── BLOQUE 6: RECURSOS, CALENDARIO Y MODALIDADES ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Layers className="size-4 text-primary" />
          <h3 className="font-semibold text-foreground">Bloque 6: Recursos, Calendario y Modalidades</h3>
        </div>

        <fieldset className="grid gap-2.5">
          <legend className="mb-1 text-xs font-semibold">{doers} que lo realizan</legend>
          {resources.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay recursos configurados en la agenda.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {resources.map((resource) => (
                <div key={resource.id} className="flex items-center gap-2 rounded border p-2 bg-background">
                  <Checkbox
                    id={`service-resource-${resource.id}`}
                    checked={resourceIds.includes(resource.id)}
                    onCheckedChange={(checked) => toggleResource(resource.id, checked === true)}
                  />
                  <Label htmlFor={`service-resource-${resource.id}`} className="flex items-center gap-1.5 font-normal text-xs cursor-pointer">
                    <ColorDot color={resource.color} />
                    {resource.name}
                    {resource.active ? null : <span className="text-muted-foreground">(inactivo)</span>}
                  </Label>
                </div>
              ))}
            </div>
          )}
          <FieldError errors={errors?.resourceIds?.map((message) => ({ message }))} />
        </fieldset>

        <TextInput
          name="calendarId"
          label="Identificador de Calendario"
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          maxLength={100}
          placeholder="ej. cal-hatha-yoga"
          errors={errors?.calendarId}
          help="Identificador sincronizado para reservas y calendarios externos."
        />

        {/* Modalidades Admitidas */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 space-y-3 dark:border-indigo-900 dark:bg-indigo-950/20">
          <div>
            <Label className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 block mb-1">
              Modalidades de Cita Admitidas
            </Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Selecciona qué formatos de atención admite este servicio (el cliente o el agente podrá elegir entre ellos):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 rounded-lg border bg-background p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={allowedModalities.includes("in_person")}
                  onCheckedChange={(checked) => toggleModality("in_person", checked === true)}
                />
                <span>🏢 Presencial</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border bg-background p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={allowedModalities.includes("phone")}
                  onCheckedChange={(checked) => toggleModality("phone", checked === true)}
                />
                <span>📞 Telefónica</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border bg-background p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={allowedModalities.includes("virtual")}
                  onCheckedChange={(checked) => toggleModality("virtual", checked === true)}
                />
                <span>💻 Virtual (Cal.com)</span>
              </label>
            </div>
          </div>

          {allowedModalities.includes("virtual") && (
            <TextInput
              name="calEventTypeId"
              label="ID de Tipo de Evento en Cal.com (opcional)"
              defaultValue={service?.calEventTypeId ?? ""}
              maxLength={100}
              placeholder="ej. 129482 (deja vacío para usar el predeterminado)"
              errors={errors?.calEventTypeId}
              help="Al agendarse una cita virtual, se sincronizará automáticamente con Cal.com."
            />
          )}
        </div>

        <div className="rounded-lg border p-3 bg-muted/20">
          <label className="flex items-start gap-2.5 text-xs font-medium cursor-pointer">
            <Checkbox
              checked={requiresReason}
              onCheckedChange={(checked) => setRequiresReason(checked === true)}
              className="mt-0.5"
            />
            <div>
              <span className="font-semibold text-foreground">Exigir motivo / razón de la consulta</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                El agente de WhatsApp solicitará al cliente que detalle la razón o motivación de su consulta antes de reservar.
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* ─── BLOQUE 7: DURACIÓN, ANTELACIÓN Y MÁRGENES ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Clock className="size-4 text-primary" />
          <h3 className="font-semibold text-foreground">Bloque 7: Duración, Antelación y Márgenes</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <NumberInput
            name="durationMin"
            label={capacityMode ? "Duración mesa (min)" : "Duración (minutos)"}
            defaultValue={service?.durationMin ?? 30}
            min={5}
            max={1440}
            errors={errors?.durationMin}
          />
          <NumberInput
            name="bufferBeforeMin"
            label="Margen antes (min)"
            defaultValue={service?.bufferBeforeMin ?? 0}
            min={0}
            max={240}
            errors={errors?.bufferBeforeMin}
          />
          <NumberInput
            name="bufferAfterMin"
            label="Margen después (min)"
            defaultValue={service?.bufferAfterMin ?? 0}
            min={0}
            max={240}
            errors={errors?.bufferAfterMin}
          />
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Los márgenes dejan ocupado al profesional antes o después para preparar o recoger; el cliente no los ve.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <FieldFrame id="service-minAdvance" label="Antelación mínima" errors={errors?.minAdvanceMin} help="Cuánto antes hay que reservar como poco.">
            <div className="flex gap-2">
              <Input
                id="service-minAdvance"
                name="minAdvance"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={advance.amount}
                aria-invalid={errors?.minAdvanceMin ? true : undefined}
                className="w-24 tabular-nums"
              />
              <Select value={advanceUnit} onValueChange={(value) => (isAdvanceUnit(value) ? setAdvanceUnit(value) : undefined)}>
                <SelectTrigger aria-label="Unidad de la antelación mínima" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADVANCE_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {ADVANCE_UNIT_LABELS[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FieldFrame>
          <NumberInput
            name="maxAdvanceDays"
            label="Antelación máxima (días)"
            optional
            defaultValue={service?.maxAdvanceDays ?? ""}
            min={1}
            max={730}
            errors={errors?.maxAdvanceDays}
            help="Hasta cuántos días antes se puede reservar. Vacío = sin límite."
          />
        </div>
      </section>

      {/* ─── BLOQUE 8: NOTIFICACIONES Y RECORDATORIOS PREVIOS ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Bell className="size-4 text-amber-600" />
          <h3 className="font-semibold text-foreground">Bloque 8: Notificaciones y Recordatorios Previos</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
            <span>💡 Recordatorio y recomendaciones para el alumno/cliente (Email y WhatsApp)</span>
          </Label>
          <Textarea
            name="reminderNotes"
            rows={2}
            value={reminderNotes}
            onChange={(e) => setReminderNotes(e.target.value)}
            placeholder="ej. Llevar ropa cómoda deportiva, toalla o esterilla propia y acudir 5-10 minutos antes del inicio."
            className="text-xs border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20"
          />
          <p className="text-[11px] text-muted-foreground">
            Este recordatorio se incluirá automáticamente de forma destacada en las confirmaciones al agendarse la cita.
          </p>
        </div>

        {/* Canales de confirmación */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <Label className="text-xs font-semibold">Canales de confirmación y comunicación con el alumno</Label>
          <p className="text-[11px] text-muted-foreground">
            Vías por las que recibirá los avisos directos de este servicio (aceptación, reprogramación o cancelación):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={notifyByEmail} onCheckedChange={(c) => setNotifyByEmail(c === true)} />
              <span>✉️ Email</span>
            </label>
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={notifyByWhatsapp} onCheckedChange={(c) => setNotifyByWhatsapp(c === true)} />
              <span>💬 WhatsApp</span>
            </label>
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={notifyBySms} onCheckedChange={(c) => setNotifyBySms(c === true)} />
              <span>📱 SMS</span>
            </label>
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={notifyByTelegram} onCheckedChange={(c) => setNotifyByTelegram(c === true)} />
              <span>✈️ Telegram</span>
            </label>
          </div>
        </div>

        {/* Recordatorios automáticos previos */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 space-y-3 dark:border-amber-900 dark:bg-amber-950/20">
          <div>
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>⏰ Recordatorios automáticos previos a la cita</span>
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Selecciona por qué vías y con qué antelación se enviarán los recordatorios automáticos al cliente antes de su cita:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={reminderWhatsapp} onCheckedChange={(c) => setReminderWhatsapp(c === true)} />
              <span>💬 WhatsApp</span>
            </label>
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={reminderEmail} onCheckedChange={(c) => setReminderEmail(c === true)} />
              <span>✉️ Email</span>
            </label>
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={reminderVoice} onCheckedChange={(c) => setReminderVoice(c === true)} />
              <span>📞 Voz IA</span>
            </label>
            <label className="flex items-center gap-2 rounded border bg-background p-2 text-xs font-medium cursor-pointer">
              <Checkbox checked={reminderSms} onCheckedChange={(c) => setReminderSms(c === true)} />
              <span>📱 SMS</span>
            </label>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-medium text-foreground block">Anticipación de recordatorios:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded border bg-background p-2 text-xs">
                <Checkbox
                  id="chk-reminder-hours"
                  checked={reminderHoursEnabled}
                  onCheckedChange={(c) => setReminderHoursEnabled(c === true)}
                />
                <label htmlFor="chk-reminder-hours" className="cursor-pointer">Avisar con</label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  disabled={!reminderHoursEnabled}
                  value={reminderHours}
                  onChange={(e) => setReminderHours(e.target.value)}
                  className="w-16 h-7 text-xs text-center px-1"
                />
                <span className="text-muted-foreground">horas de antelación</span>
              </div>

              <div className="flex items-center gap-2 rounded border bg-background p-2 text-xs">
                <Checkbox
                  id="chk-reminder-minutes"
                  checked={reminderMinutesEnabled}
                  onCheckedChange={(c) => setReminderMinutesEnabled(c === true)}
                />
                <label htmlFor="chk-reminder-minutes" className="cursor-pointer">Avisar con</label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  disabled={!reminderMinutesEnabled}
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(e.target.value)}
                  className="w-16 h-7 text-xs text-center px-1"
                />
                <span className="text-muted-foreground">minutos de antelación</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BLOQUE 9: ESTADO Y APROBACIÓN ─── */}
      <section className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <CheckCircle2 className="size-4 text-primary" />
          <h3 className="font-semibold text-foreground">Bloque 9: Estado y Aprobación</h3>
        </div>

        <SwitchRow
          id="service-manual"
          label="Requiere confirmación manual / aprobación previa"
          checked={manual}
          onChange={setManual}
          help={`La ${words.booking} se crea en espera de aprobación del responsable, el agente de IA se lo indica al cliente y el equipo recibe un aviso inmediato.`}
        />
        <SwitchRow
          id="service-active"
          label="Servicio activo y disponible para reservas"
          checked={active}
          onChange={setActive}
          help="Un servicio inactivo no se ofrece al cliente ni por el agente de IA; sus citas históricas se mantienen."
        />
      </section>

      <FormMessage result={failure ?? undefined} />
      <div className="sticky bottom-0 z-10 -mx-4 -mb-10 flex justify-end gap-2 border-t bg-background/95 p-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none size-4 mr-2" /> : null}
          {pending ? "Guardando…" : service ? "Guardar cambios" : "Crear servicio"}
        </Button>
      </div>
    </form>
  );
}

type FrameProps = { id: string; label: string; optional?: boolean; help?: string; errors?: string[]; children: ReactNode };

function FieldFrame({ id, label, optional, help, errors, children }: FrameProps) {
  return (
    <Field data-invalid={errors ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground text-xs ml-1">(opcional)</span> : null}
      </FieldLabel>
      {children}
      {help ? <FieldDescription id={`${id}-help`} className="text-xs">{help}</FieldDescription> : null}
      <FieldError id={`${id}-error`} errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}

const describedBy = (id: string, help?: string, errors?: string[]) => (errors ? `${id}-error` : help ? `${id}-help` : undefined);

type InputProps = { name: string; label: string; optional?: boolean; help?: string; errors?: string[] } & Omit<ComponentProps<typeof Input>, "name" | "id">;

function TextInput({ name, label, optional, help, errors, ...input }: InputProps) {
  const id = `service-${name}`;
  return (
    <FieldFrame id={id} label={label} optional={optional} help={help} errors={errors}>
      <Input id={id} name={name} aria-invalid={errors ? true : undefined} aria-describedby={describedBy(id, help, errors)} {...input} />
    </FieldFrame>
  );
}

function NumberInput({ name, label, optional, help, errors, className, ...input }: InputProps) {
  const id = `service-${name}`;
  return (
    <FieldFrame id={id} label={label} optional={optional} help={help} errors={errors}>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy(id, help, errors)}
        className={className ?? "tabular-nums"}
        {...input}
      />
    </FieldFrame>
  );
}

function SwitchRow({ id, label, help, checked, onChange }: { id: string; label: string; help: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="grid gap-1">
        <Label htmlFor={id} className="text-xs font-medium cursor-pointer">{label}</Label>
        <p id={`${id}-help`} className="text-xs text-muted-foreground leading-relaxed">
          {help}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-help`} />
    </div>
  );
}
