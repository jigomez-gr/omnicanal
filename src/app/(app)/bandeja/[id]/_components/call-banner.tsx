import { Clock, DollarSign, Download, FileText, PhoneIncoming, PhoneOutgoing, Smartphone, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type CallBannerProps = {
  metadata?: Record<string, unknown> | null;
  summary?: string | null;
  className?: string;
};

export function CallDetailBanner({ metadata, summary, className }: CallBannerProps) {
  const meta = metadata ?? {};
  const direction = (meta.direction as string) ?? "inbound";
  const durationSec = typeof meta.durationSeconds === "number" ? meta.durationSeconds : (meta.duration as number) ?? null;
  const cost = typeof meta.cost === "number" ? meta.cost : null;
  const rawRecordingUrl = (meta.recordingUrl as string) ?? null;
  const callId = (meta.callId as string) ?? null;
  const vapiCallId = (meta.vapiCallId as string) ?? null;
  const callerNumber = (meta.callerNumber as string) ?? (meta.fromNumber as string) ?? (meta.toNumber as string) ?? null;
  const callStatus = (meta.status as string) ?? "ended";
  const callSummary = summary || (meta.summary as string) || null;

  // Si disponemos de identificador de la llamada, usamos el proxy seguro del servidor que renueva enlaces de S3 y añade auth
  const audioSrc = (callId || vapiCallId)
    ? `/api/calls/${encodeURIComponent(callId || vapiCallId!)}/recording`
    : rawRecordingUrl;

  const downloadUrl = audioSrc
    ? `${audioSrc}${audioSrc.includes("?") ? "&" : "?"}download=1`
    : null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    if (mins === 0) return `${remainingSec} s`;
    return `${mins} min ${remainingSec} s`;
  };

  return (
    <div className={cn("mx-4 my-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="inline-flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            {direction === "outbound" ? <PhoneOutgoing className="size-4" /> : <PhoneIncoming className="size-4" />}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-blue-950">
              {direction === "outbound" ? "Llamada telefónica saliente (Vapi)" : "Llamada telefónica entrante (Vapi)"}
            </h3>
            {callerNumber ? (
              <p className="text-[11px] text-blue-700 font-mono">
                {callerNumber}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {durationSec !== null ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-blue-900 border border-blue-200">
              <Clock className="size-3 text-blue-500" />
              {formatDuration(durationSec)}
            </span>
          ) : null}
          {cost !== null ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-blue-900 border border-blue-200">
              <DollarSign className="size-3 text-blue-500" />
              ${cost.toFixed(3)}
            </span>
          ) : null}
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
            {callStatus === "ended" ? "Finalizada" : callStatus}
          </span>
        </div>
      </div>

      {audioSrc ? (
        <div className="space-y-1.5 rounded-lg border border-blue-100 bg-white/80 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-900">
              <Volume2 className="size-3.5 text-blue-600" />
              <span>Grabación de audio de la llamada:</span>
            </div>
            {downloadUrl ? (
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 underline"
              >
                <Download className="size-3" />
                Descargar audio (.mp3)
              </a>
            ) : null}
          </div>
          <audio controls preload="metadata" src={audioSrc} className="w-full h-8 outline-none">
            Tu navegador no soporta el reproductor de audio.
          </audio>
        </div>
      ) : (
        <div className="rounded-lg border border-blue-100 bg-white/60 p-2 text-[11px] text-blue-800">
          Audio en proceso de generación en VAPI. Si la llamada acaba de finalizar, se cargará en unos instantes.
        </div>
      )}

      {callSummary ? (
        <div className="rounded-lg border border-blue-100 bg-white/70 p-2.5 text-xs text-blue-950 space-y-1">
          <div className="flex items-center gap-1 font-semibold text-blue-900">
            <FileText className="size-3.5 text-blue-600" />
            <span>Resumen de la llamada</span>
          </div>
          <p className="leading-relaxed whitespace-pre-wrap">{callSummary}</p>
        </div>
      ) : null}
    </div>
  );
}

export function SmsDetailBanner({ metadata, className }: { metadata?: Record<string, unknown> | null; className?: string }) {
  const meta = metadata ?? {};
  const phone = (meta.phone as string) ?? (meta.numeroDestino as string) ?? null;
  const senderId = (meta.senderId as string) ?? "Zadarma";
  const status = (meta.status as string) ?? "enviado";

  return (
    <div className={cn("mx-4 my-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-xs space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <Smartphone className="size-3.5" />
          </div>
          <div className="text-xs font-semibold text-emerald-950">
            Mensaje SMS (Zadarma) · Remitente: {senderId}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {phone ? <span className="text-[11px] text-emerald-800 font-mono">{phone}</span> : null}
          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{status}</span>
        </div>
      </div>
    </div>
  );
}
