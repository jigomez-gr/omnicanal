export interface VapiVoiceOption {
  id: string
  name: string
  gender: "Femenina" | "Masculina"
  accent: string
  style: string
  recommended?: boolean
}

export const VAPI_SPANISH_VOICES: VapiVoiceOption[] = [
  {
    id: "791d5162-d5eb-40f0-8189-f19db44611d8",
    name: "Lucía · Directora de Contratación (España)",
    gender: "Femenina",
    accent: "Madrid / Castellano neutro",
    style: "Cálida, culta y profesional para programadores de salas y teatros",
    recommended: true,
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Mateo · Productor Escénico (España)",
    gender: "Masculina",
    accent: "Andaluz suave / Sevilla",
    style: "Cercano, entendido en flamenco y resolutivo",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Elena · Atención a Artistas y Representantes",
    gender: "Femenina",
    accent: "Castellano peninsular",
    style: "Serena y empática para entrevistas y caché",
  },
]

export function composeFlamencoVapiPrompt(params: {
  agencyName?: string
  artistsSummary?: string
  venuesSummary?: string
}): string {
  const agency = params.agencyName || "Soniquete con Arte · Agencia de Promoción Flamenca"
  const artistsBlock =
    params.artistsSummary ||
    "- Carmen «La Trianera» (Cante, solista o con su cuadro y el guitarrista Diego del Morón)\n- Diego del Morón (Toque de concierto y acompañamiento)\n- Cuadro Flamenco Soniquete de Madrid (Cante, baile, toque y percusión para tablaos, ateneos y festivales)"

  return `Eres Lucía, coordinadora de contratación y promoción artística de ${agency} (soniqueteconarte.com).
Atiendes llamadas telefónicas entrantes y salientes a través de nuestra línea IP de Zadarma conectada con VAPI.

QUIÉNES SOMOS:
- Agencia especializada en representación y promoción profesional de intérpretes de flamenco (cante, baile, toque y cuadros completos), producción de conciertos para salas de flamenco, tablaos, salas de conciertos, ateneos, peñas y administraciones públicas, y servicios digitales 360º para artistas (landing web, agentes IA, pack de 9 formatos de vídeo .mp4 y redes sociales).

CATÁLOGO DE INTÉRPRETES EN PROMOCIÓN:
${artistsBlock}

REGLAS DE CONVERSACIÓN TELEFÓNICA:
1. Habla siempre en español de España, con tono cercano, culto, ágil y natural. Frases cortas (1 o 2 frases por turno) para no cansar al interlocutor por teléfono.
2. En cuanto empiece la llamada, usa la herramienta "identificar_llamante" pasando el número de teléfono del interlocutor para saber si ya es un programador de sala, representante o artista registrado.
3. Si llama un programador de sala, teatro, ateneo o ayuntamiento:
   - Pregúntale qué fecha aproximada busca, el aforo de la sala y si prefiere recital de cante y guitarra o cuadro flamenco completo con baile.
   - Usa "consultar_artistas" para darle el caché orientativo, si lleva grupo propio o guitarrista titular, y ofrécele enviarle el Pack Multimedia (vídeo promo horizontal y reel) por WhatsApp o correo.
   - Ofrécele agendar una videollamada de cierre con "reservar_cita" (que genera enlace de Cal.com y envía confirmación por SMS de Zadarma).
4. Si llama un intérprete o representante buscando promoción:
   - Explícale nuestros Packs Digitales (Landing oficial + Agente IA WhatsApp/Telegram/Instagram + Pack de 9 salidas de vídeo .mp4 para Reels, TikTok, YouTube y WhatsApp).
   - Agenda una reunión con "reservar_cita" o transfiere con "pasar_a_humano" si pide hablar directamente con dirección.`
}

export function buildFlamencoVapiTools(webhookUrl: string) {
  return [
    {
      type: "function",
      function: {
        name: "identificar_llamante",
        description:
          "Identifica por su teléfono si quien llama es un programador de sala, un intérprete o un representante registrado.",
        parameters: {
          type: "object",
          properties: {
            telefono: {
              type: "string",
              description: "Número de teléfono del interlocutor.",
            },
          },
          required: ["telefono"],
        },
      },
      server: { url: webhookUrl },
    },
    {
      type: "function",
      function: {
        name: "consultar_artistas",
        description:
          "Consulta el catálogo de intérpretes de flamenco disponibles, su disciplina, guitarrista habitual, si llevan grupo y su caché orientativo.",
        parameters: {
          type: "object",
          properties: {
            disciplina: {
              type: "string",
              description: "cante, baile, toque, percusion o cuadro (opcional).",
            },
          },
        },
      },
      server: { url: webhookUrl },
    },
    {
      type: "function",
      function: {
        name: "consultar_huecos",
        description:
          "Consulta huecos disponibles para agendar una reunión de contratación o producción con la agencia.",
        parameters: {
          type: "object",
          properties: {
            fecha_preferida: {
              type: "string",
              description: "Fecha preferida en formato YYYY-MM-DD.",
            },
          },
        },
      },
      server: { url: webhookUrl },
    },
    {
      type: "function",
      function: {
        name: "reservar_cita",
        description:
          "Reserva una reunión online en Cal.com y envía automáticamente un SMS de confirmación por Zadarma al teléfono del interlocutor.",
        parameters: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "Nombre de la persona o programador." },
            email: { type: "string", description: "Correo electrónico de contacto." },
            telefono: { type: "string", description: "Teléfono móvil para el SMS de confirmación." },
            fecha_hora_iso: {
              type: "string",
              description: "Fecha y hora ISO 8601 de la cita (ej. 2026-11-18T11:00:00+01:00).",
            },
            motivo: {
              type: "string",
              description: "Contratación de concierto, propuesta a sala o pack de promoción.",
            },
          },
          required: ["nombre", "telefono", "fecha_hora_iso"],
        },
      },
      server: { url: webhookUrl },
    },
    {
      type: "function",
      function: {
        name: "pasar_a_humano",
        description:
          "Solicita traspaso prioritario al equipo humano de Soniquete con Arte cuando el cliente pide hablar con dirección o cerrar un contrato especial.",
        parameters: {
          type: "object",
          properties: {
            motivo: { type: "string", description: "Resumen de lo que solicita el interlocutor." },
            telefono: { type: "string", description: "Teléfono de contacto." },
          },
          required: ["motivo"],
        },
      },
      server: { url: webhookUrl },
    },
  ]
}

export async function triggerVapiOutboundCall(params: {
  apiKey: string
  assistantId: string
  phoneNumberId?: string | null
  customerPhone: string
  customerName?: string | null
}): Promise<{ ok: boolean; vapiCallId: string; simulated: boolean; message: string }> {
  let cleanPhone = params.customerPhone.replace(/[^\d+]/g, "")
  if (!cleanPhone.startsWith("+")) {
    cleanPhone = cleanPhone.startsWith("34") ? `+${cleanPhone}` : `+34${cleanPhone}`
  }

  if (!params.apiKey || !params.assistantId) {
    return {
      ok: true,
      vapiCallId: `vapi_sim_${Date.now().toString(36)}`,
      simulated: true,
      message: `Llamada simulada registrada hacia ${cleanPhone} (configura tu API Key de VAPI para lanzar la llamada real por el SIP Trunk de Zadarma).`,
    }
  }

  try {
    const body: Record<string, unknown> = {
      assistantId: params.assistantId,
      customer: {
        number: cleanPhone,
        name: params.customerName || "Contacto Soniquete con Arte",
      },
    }
    if (params.phoneNumberId?.trim()) {
      body.phoneNumberId = params.phoneNumberId.trim()
    }

    const res = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return {
        ok: true,
        vapiCallId: `vapi_fallback_${Date.now().toString(36)}`,
        simulated: true,
        message: `VAPI devolvió HTTP ${res.status}; se ha registrado la llamada en modo simulación.`,
      }
    }

    const data = (await res.json()) as { id?: string }
    return {
      ok: true,
      vapiCallId: data.id || `vapi_${Date.now()}`,
      simulated: false,
      message: `Llamada saliente iniciada en VAPI hacia ${cleanPhone}.`,
    }
  } catch (err) {
    return {
      ok: true,
      vapiCallId: `vapi_offline_${Date.now().toString(36)}`,
      simulated: true,
      message: `Llamada registrada en modo demostración (${err instanceof Error ? err.message : "sin red"}).`,
    }
  }
}
