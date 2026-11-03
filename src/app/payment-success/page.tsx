import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-xl font-bold">¡Pago confirmado en soniqueteflamenco.com!</h1>
        <p className="text-sm text-muted-foreground">
          Hemos recibido correctamente el abono de tu reserva / contrato artístico a través de nuestra pasarela segura (Stripe / Bizum). Recibirás el justificante en tu correo electrónico.
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
