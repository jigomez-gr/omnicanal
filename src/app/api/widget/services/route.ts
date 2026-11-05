import { NextResponse } from "next/server"
import { getPublicUnifiedServicesCatalog } from "@/data/flamenco"

export const dynamic = "force-dynamic"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  try {
    const payload = await getPublicUnifiedServicesCatalog()
    return NextResponse.json(payload, { headers: CORS_HEADERS })
  } catch {
    return NextResponse.json(
      {
        success: false,
        businessName: "Soniquete con Arte · Promoción Flamenca",
        whatsappNumber: "+34648212650",
        categories: [],
        services: [],
      },
      { status: 200, headers: CORS_HEADERS },
    )
  }
}
