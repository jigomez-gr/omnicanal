export interface CalcomBookingInput {
  apiKey: string
  baseUrl?: string | null
  eventTypeId: string | number
  startIso: string
  attendeeName: string
  attendeeEmail: string
  attendeePhone?: string | null
  notes?: string | null
  timeZone?: string
}

export interface CalcomBookingResult {
  uid: string
  meetingUrl: string
  raw?: unknown
  simulated: boolean
}

export function getCalcomV2BaseUrl(configuredUrl?: string | null): string {
  const baseUrl = configuredUrl?.trim() || "https://api.cal.com/v2"
  return baseUrl.replace(/\/v1\/?$/, "/v2").replace(/\/+$/, "")
}

export function generateFallbackCalcomVideoUrl(seed?: string): string {
  const slug = (seed ?? Math.random().toString(36).slice(2, 10))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10)
  return `https://app.cal.com/video/soniquete-${slug || "flamenco"}`
}

export async function testCalcomConnection(params: {
  apiKey: string
  baseUrl?: string | null
}): Promise<{ ok: boolean; status: number; message: string }> {
  const baseUrl = getCalcomV2BaseUrl(params.baseUrl)
  try {
    const res = await fetch(`${baseUrl}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "cal-api-version": "2024-08-13",
      },
    })
    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        message: "Conexión verificada correctamente con Cal.com API v2.",
      }
    }
    return {
      ok: false,
      status: res.status,
      message: `Cal.com respondió con estado HTTP ${res.status}. Revisa tu API Key (cal_live_...).`,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: `No se pudo conectar con Cal.com: ${err instanceof Error ? err.message : "Error de red"}`,
    }
  }
}

export async function createCalcomBooking(
  input: CalcomBookingInput,
): Promise<CalcomBookingResult> {
  const eventTypeNum = Number(input.eventTypeId)
  if (!input.apiKey || !Number.isFinite(eventTypeNum) || eventTypeNum <= 0) {
    return {
      uid: `sim-${Date.now().toString(36)}`,
      meetingUrl: generateFallbackCalcomVideoUrl(input.attendeeName),
      simulated: true,
    }
  }

  const baseUrl = getCalcomV2BaseUrl(input.baseUrl)
  const payload = {
    start: new Date(input.startIso).toISOString(),
    eventTypeId: eventTypeNum,
    attendee: {
      name: input.attendeeName || "Programador / Artista",
      email: input.attendeeEmail || "soniqueteconarte@soniqueteconarte.com",
      timeZone: input.timeZone || "Europe/Madrid",
      language: "es",
    },
    bookingFieldsResponses: {
      notes: input.notes || "Reunión de contratación / producción artística · Soniquete con Arte",
      phone: input.attendeePhone || "",
    },
    metadata: {
      source: "soniquete-con-arte",
    },
  }

  try {
    const response = await fetch(`${baseUrl}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "cal-api-version": "2024-08-13",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return {
        uid: `fallback-${Date.now().toString(36)}`,
        meetingUrl: generateFallbackCalcomVideoUrl(input.attendeeName),
        simulated: true,
      }
    }

    const result = (await response.json()) as {
      data?: {
        uid?: string
        id?: string | number
        meetingUrl?: string
        location?: string
        references?: Array<{ meetingUrl?: string }>
      }
    }
    const bookingData = result.data ?? {}
    const meetingUrl =
      bookingData.meetingUrl ||
      bookingData.location ||
      bookingData.references?.find((r) => r.meetingUrl)?.meetingUrl ||
      generateFallbackCalcomVideoUrl(String(bookingData.uid ?? input.attendeeName))

    return {
      uid: String(bookingData.uid ?? bookingData.id ?? `cal-${Date.now()}`),
      meetingUrl,
      raw: bookingData,
      simulated: false,
    }
  } catch {
    return {
      uid: `fallback-${Date.now().toString(36)}`,
      meetingUrl: generateFallbackCalcomVideoUrl(input.attendeeName),
      simulated: true,
    }
  }
}
