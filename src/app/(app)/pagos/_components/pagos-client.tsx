"use client"

import {
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Plus,
  RefreshCw,
  Settings2,
  Wallet,
} from "lucide-react"
import { useState, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { getCalcomConfig, getPaymentsDashboard } from "@/data/flamenco"
import {
  createPaymentOrLinkServerAction,
  markPaymentPaidServerAction,
  saveCalcomConfigServerAction,
  saveStripeConfigServerAction,
  testCalcomConnectionServerAction,
} from "../actions"

type PaymentsData = Awaited<ReturnType<typeof getPaymentsDashboard>>
type CalcomData = Awaited<ReturnType<typeof getCalcomConfig>>

export function PagosClient({
  payments,
  calcom,
  canManage,
  canConfigure,
}: {
  payments: PaymentsData
  calcom: CalcomData
  canManage: boolean
  canConfigure: boolean
}) {
  const [activeTab, setActiveTab] = useState<"cobros" | "pasarela_stripe" | "calcom">(
    "cobros",
  )
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  // Estados nuevo cobro / link de pago
  const [concept, setConcept] = useState("Señal 50% Actuación Cuadro Flamenco · Sala Villanos")
  const [payerName, setPayerName] = useState("Programación Sala Villanos")
  const [payerEmail, setPayerEmail] = useState("programacion@salavillanos.es")
  const [payerPhone, setPayerPhone] = useState("+34 611 222 333")
  const [amountEur, setAmountEur] = useState("1100")
  const [method, setMethod] = useState<"stripe" | "bizum" | "transfer" | "cash">("stripe")
  const [markPaid, setMarkPaid] = useState(false)

  // Estados configuración Stripe & Bizum (idéntico al de crm_salvadora)
  const [stripeEnabled, setStripeEnabled] = useState(payments.config.stripeEnabled)
  const [publishableKey, setPublishableKey] = useState(payments.config.publishableKey)
  const [secretKey, setSecretKey] = useState(payments.config.maskedSecretKey ?? "")
  const [webhookSecret, setWebhookSecret] = useState(payments.config.maskedWebhookSecret ?? "")
  const [enableCardAndWallets, setEnableCardAndWallets] = useState(
    payments.config.enableCardAndWallets,
  )
  const [enableBizum, setEnableBizum] = useState(payments.config.enableBizum)

  // Estados configuración Cal.com (idéntico al de crm_salvadora)
  const [calEnabled, setCalEnabled] = useState(calcom.enabled)
  const [calApiKey, setCalApiKey] = useState(calcom.maskedApiKey ?? "")
  const [calBaseUrl, setCalBaseUrl] = useState(calcom.baseUrl)
  const [calEventTypeId, setCalEventTypeId] = useState(calcom.defaultEventTypeId)
  const [calAutoSync, setCalAutoSync] = useState(calcom.autoSyncBookings)

  const filteredRecords = payments.records.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter,
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Total Cobrado (Confirmado)</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {payments.summary.totalPaidEur.toLocaleString("es-ES", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </div>
          <div className="text-xs text-muted-foreground">
            {payments.summary.paidCount} pagos completados
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Pendiente de Cobro (Links activos)</div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {payments.summary.totalPendingEur.toLocaleString("es-ES", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </div>
          <div className="text-xs text-muted-foreground">
            {payments.summary.pendingCount} enlaces pendientes
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">Pasarelas y Citas Online</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={stripeEnabled ? "default" : "secondary"}>
              Stripe {stripeEnabled ? "Activo" : "Inactivo"}
            </Badge>
            <Badge variant={enableBizum ? "default" : "secondary"}>
              Bizum {enableBizum ? "Activo" : "Inactivo"}
            </Badge>
            <Badge variant={calEnabled ? "default" : "secondary"}>
              Cal.com {calEnabled ? "Activo" : "Inactivo"}
            </Badge>
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

      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          variant={activeTab === "cobros" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("cobros")}
          className="gap-1.5"
        >
          <Wallet className="size-4" />
          Cobros y Enlaces de Pago ({payments.records.length})
        </Button>
        <Button
          variant={activeTab === "pasarela_stripe" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("pasarela_stripe")}
          className="gap-1.5"
        >
          <CreditCard className="size-4" />
          Pasarela de Pago (Stripe & Bizum)
        </Button>
        <Button
          variant={activeTab === "calcom" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("calcom")}
          className="gap-1.5"
        >
          <Calendar className="size-4" />
          Integración con Cal.com (Citas Virtuales)
        </Button>
      </div>

      {/* TAB 1: LISTADO DE COBROS + GENERAR LINK STRIPE/BIZUM */}
      {activeTab === "cobros" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {[
                  { key: "all", label: "Todos" },
                  { key: "pending", label: "Pendientes" },
                  { key: "paid", label: "Pagados" },
                ].map((f) => (
                  <Button
                    key={f.key}
                    variant={statusFilter === f.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 2xl:grid-cols-2">
              {filteredRecords.map((rec) => (
                <div key={rec.id} className="rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold">{rec.concept}</h4>
                        <Badge variant={rec.status === "paid" ? "default" : "secondary"}>
                          {rec.status === "paid" ? "Pagado" : "Pendiente"}
                        </Badge>
                        <Badge variant="outline">{rec.method.toUpperCase()}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Cliente / Sala: <strong>{rec.payerName}</strong>
                        {rec.payerEmail ? ` · ${rec.payerEmail}` : ""}
                        {rec.payerPhone ? ` · ${rec.payerPhone}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {(rec.amountCents / 100).toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        {rec.currency}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(rec.createdAt).toLocaleDateString("es-ES")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
                    {rec.stripePaymentUrl ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={rec.stripePaymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                        >
                          Abrir Checkout Stripe / Bizum <ExternalLink className="size-3" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(rec.stripePaymentUrl!)
                            setFeedback("Enlace de pago copiado para enviar por WhatsApp o Correo.")
                          }}
                        >
                          <Copy className="mr-1 size-3" />
                          Copiar link
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Cobro manual</span>
                    )}

                    {canManage && rec.status !== "paid" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            await markPaymentPaidServerAction(rec.id)
                            setFeedback(`Cobro «${rec.concept}» marcado como pagado.`)
                          })
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" />
                        Marcar como Pagado
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canManage && (
            <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-4">
              <h3 className="mb-3 text-base font-bold">
                Generar Enlace Stripe / Bizum o Registrar Cobro
              </h3>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  startTransition(async () => {
                    const created = await createPaymentOrLinkServerAction({
                      concept,
                      payerName,
                      payerEmail,
                      payerPhone,
                      amountEur: Number(amountEur) || 500,
                      method,
                      markAsPaidImmediately: markPaid,
                    })
                    setFeedback(
                      created.stripePaymentUrl
                        ? `Enlace de pago Stripe/Bizum generado para «${created.concept}».`
                        : `Cobro registrado correctamente.`,
                    )
                  })
                }}
              >
                <div>
                  <Label>Concepto (Concierto, Señal o Pack Artista) *</Label>
                  <Input
                    required
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nombre de la Sala, Promotor o Artista *</Label>
                  <Input
                    required
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label>Importe (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={amountEur}
                      onChange={(e) => setAmountEur(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Método</Label>
                    <select
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={method}
                      onChange={(e) =>
                        setMethod(e.target.value as "stripe" | "bizum" | "transfer" | "cash")
                      }
                    >
                      <option value="stripe">Stripe Checkout (Tarjeta / Wallet)</option>
                      <option value="bizum">Bizum (vía Stripe)</option>
                      <option value="transfer">Transferencia bancaria</option>
                      <option value="cash">Efectivo / Taquilla</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={markPaid}
                    onChange={(e) => setMarkPaid(e.target.checked)}
                  />
                  Marcar como cobrado inmediatamente (sin esperar webhook)
                </label>
                <Button type="submit" disabled={isPending} className="w-full">
                  <Plus className="mr-1.5 size-4" />
                  Crear Enlace de Pago / Cobro
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PANEL IDÉNTICO AL DE CRM_SALVADORA: "Pasarela de Pago (Stripe & Bizum)" */}
      {activeTab === "pasarela_stripe" && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Pasarela de Pago (Stripe & Bizum)</h3>
                <p className="text-xs text-muted-foreground">
                  Configura los cobros con tarjeta y Bizum para el agente y el panel
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={stripeEnabled}
                onChange={(e) => setStripeEnabled(e.target.checked)}
              />
              Stripe Activo
            </label>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              startTransition(async () => {
                await saveStripeConfigServerAction({
                  stripeEnabled,
                  publishableKey,
                  secretKey,
                  webhookSecret,
                  enableCardAndWallets,
                  enableBizum,
                  currency: "EUR",
                })
                setFeedback(
                  "Configuración de Pasarela de Pago (Stripe & Bizum) guardada y cifrada con APP_ENCRYPTION_KEY.",
                )
              })
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Stripe Publishable Key (Pública)</Label>
                <Input
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_live_... o pk_test_..."
                />
              </div>
              <div>
                <Label>Stripe Secret Key (Privada)</Label>
                <Input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="sk_live_... o sk_test_..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Stripe Webhook Signing Secret</Label>
                <Input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                />
              </div>
              <div>
                <Label>URL para configurar en Stripe Webhooks</Label>
                <div className="flex gap-2">
                  <Input value={payments.config.webhookUrl} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(payments.config.webhookUrl)
                      setFeedback("URL de Stripe Webhook copiada al portapapeles.")
                    }}
                  >
                    <Copy className="mr-1 size-3.5" />
                    Copiar
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enableCardAndWallets}
                  onChange={(e) => setEnableCardAndWallets(e.target.checked)}
                />
                Habilitar pago con Tarjeta / Apple Pay / Google Pay
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enableBizum}
                  onChange={(e) => setEnableBizum(e.target.checked)}
                />
                Habilitar Bizum ( vía Stripe )
              </label>
            </div>

            {canConfigure && (
              <Button type="submit" disabled={isPending}>
                <Settings2 className="mr-1.5 size-4" />
                Guardar Pasarela Stripe & Bizum
              </Button>
            )}
          </form>
        </div>
      )}

      {/* TAB 3: PANEL IDÉNTICO AL DE CRM_SALVADORA: "Integración con Cal.com (Citas Virtuales)" */}
      {activeTab === "calcom" && (
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <Calendar className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  Integración con Cal.com (Citas Virtuales)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Sincronización de agenda y generación de enlaces de videollamada
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={calEnabled}
                onChange={(e) => setCalEnabled(e.target.checked)}
              />
              Cal.com Activo
            </label>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              startTransition(async () => {
                await saveCalcomConfigServerAction({
                  enabled: calEnabled,
                  apiKey: calApiKey,
                  baseUrl: calBaseUrl,
                  defaultEventTypeId: calEventTypeId,
                  autoSyncBookings: calAutoSync,
                })
                setFeedback(
                  "Configuración de Cal.com API v2 guardada y cifrada correctamente.",
                )
              })
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Cal.com API Key</Label>
                <Input
                  type="password"
                  value={calApiKey}
                  onChange={(e) => setCalApiKey(e.target.value)}
                  placeholder="cal_live_..."
                />
              </div>
              <div>
                <Label>URL Base de la API</Label>
                <Input
                  value={calBaseUrl}
                  onChange={(e) => setCalBaseUrl(e.target.value)}
                  placeholder="https://api.cal.com/v2"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Event Type ID por defecto (Citas Virtuales)</Label>
                <Input
                  value={calEventTypeId}
                  onChange={(e) => setCalEventTypeId(e.target.value)}
                  placeholder="123456"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={calAutoSync}
                    onChange={(e) => setCalAutoSync(e.target.checked)}
                  />
                  Sincronizar reservas automáticamente con Cal.com
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {canConfigure && (
                <Button type="submit" disabled={isPending}>
                  Guardar configuración Cal.com
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await testCalcomConnectionServerAction()
                    setFeedback(res.message)
                  })
                }}
              >
                <RefreshCw className="mr-1.5 size-4" />
                Probar conexión con Cal.com
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
