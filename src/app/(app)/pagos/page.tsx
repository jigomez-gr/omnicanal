import type { Metadata } from "next"
import { noPermissionDescription } from "@/components/app-shell/navigation"
import { NoPermission } from "@/components/no-permission"
import { PageHeader } from "@/components/page-header"
import { getCalcomConfig, getPaymentsDashboard } from "@/data/flamenco"
import { can, PERMISSIONS } from "@/lib/permissions"
import { requirePageActor } from "@/server/session"
import { PagosClient } from "./_components/pagos-client"

export const metadata: Metadata = {
  title: "Pagos (Stripe & Bizum) y Citas Cal.com · Soniquete con Arte",
}

export default async function PagosPage() {
  const actor = await requirePageActor({ next: "/pagos" })
  if (!can(actor, PERMISSIONS.campaigns.view)) {
    return <NoPermission description={noPermissionDescription(actor.role)} />
  }

  const [payments, calcom] = await Promise.all([
    getPaymentsDashboard(actor),
    getCalcomConfig(actor),
  ])

  const canManage = can(actor, PERMISSIONS.campaigns.manage)
  const canConfigure = can(actor, PERMISSIONS.settings.integrations)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos (Stripe & Bizum) e Integración Cal.com"
        description="Cobros de señales de contratos, cachés de conciertos y packs digitales para artistas mediante Stripe Checkout y Bizum, y sincronización de videollamadas con Cal.com API v2."
      />
      <PagosClient
        payments={payments}
        calcom={calcom}
        canManage={canManage}
        canConfigure={canConfigure}
      />
    </div>
  )
}
