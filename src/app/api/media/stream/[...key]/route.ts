import fs from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
}

function resolveMediaBaseDir(): string {
  const configured = process.env.MEDIA_STORAGE_ROOT?.trim()
  if (configured && fs.existsSync(configured)) return path.resolve(configured)
  const siblingSoniqueteMedia = path.resolve(process.cwd(), "..", "soniqueteflamenco", "media_base")
  if (fs.existsSync(siblingSoniqueteMedia)) return siblingSoniqueteMedia
  const serverVolume = "/var/data/soniqueteflamenco/media"
  if (fs.existsSync(serverVolume)) return serverVolume
  return path.resolve(process.cwd(), "media_base")
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key } = await context.params
  if (!Array.isArray(key) || key.length === 0) {
    return NextResponse.json({ error: "Archivo multimedia no especificado." }, { status: 400 })
  }

  const baseDir = resolveMediaBaseDir()
  const relativeSegments = key.map((segment) => decodeURIComponent(segment))
  const resolvedPath = path.resolve(baseDir, ...relativeSegments)

  if (!resolvedPath.startsWith(baseDir + path.sep) && resolvedPath !== baseDir) {
    return NextResponse.json({ error: "Ruta multimedia no permitida." }, { status: 403 })
  }

  let stat: fs.Stats
  try {
    stat = await fs.promises.stat(resolvedPath)
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Archivo multimedia no encontrado." }, { status: 404 })
    }
  } catch {
    return NextResponse.json({ error: "Archivo multimedia no encontrado." }, { status: 404 })
  }

  const ext = path.extname(resolvedPath).toLowerCase()
  const contentType = MIME_BY_EXT[ext] || "application/octet-stream"
  const fileSize = stat.size
  const rangeHeader = request.headers.get("range")

  if (rangeHeader && contentType.startsWith("video/")) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0
      const end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1
      if (start >= 0 && start < fileSize && end >= start && end < fileSize) {
        const chunkSize = end - start + 1
        const fileHandle = await fs.promises.open(resolvedPath, "r")
        const buffer = Buffer.alloc(chunkSize)
        await fileHandle.read(buffer, 0, chunkSize, start)
        await fileHandle.close()

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        })
      }
    }
  }

  const fullBuffer = await fs.promises.readFile(resolvedPath)
  return new NextResponse(fullBuffer, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
