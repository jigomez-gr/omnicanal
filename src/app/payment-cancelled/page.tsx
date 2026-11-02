import { XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PaymentCancelledPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <XCircle className="size-8" />
        </div>
        <h1 className="text-xl font-bold">Pago cancelado o aplazado</h1>
        <p className="text-sm text-muted-foreground">
          No se ha realizado ningún cargo. Puedes retomar el enlace de pago en cualquier momento o contactar con Soniquete con Arte (soniqueteflamenco@soniqueteflamenco.com).
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild>
            <Link href="/pagos">Volver a Pagos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/promocion">Ir a Promoción Artística</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
