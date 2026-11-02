import type { Metadata } from "next"
import { noPermissionDescription } from "@/components/app-shell/navigation"
import { NoPermission } from "@/components/no-permission"
import { PageHeader } from "@/components/page-header"
import { getCalcomConfig, getFlamencoHubSnapshot } from "@/data/flamenco"
import { can, PERMISSIONS } from "@/lib/permissions"
import { requirePageActor } from "@/server/session"
import { CitasOnlineClient } from "./_components/citas-online-client"

export const metadata: Metadata = {
  title: "Citas Online (Cal.com)",
}

export default async function CitasOnlinePage() {
  const actor = await requirePageActor({ next: "/citas-online" })
  if (!can(actor, PERMISSIONS.campaigns.view) && !can(actor, PERMISSIONS.agenda.view)) {
    return <NoPermission description={noPermissionDescription(actor.role)} />
  }

  const [calcom, hub] = await Promise.all([
    getCalcomConfig(actor),
    getFlamencoHubSnapshot(actor),
  ])

  const canManage = can(actor, PERMISSIONS.campaigns.manage)
  const canConfigure = can(actor, PERMISSIONS.settings.integrations)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas Online y Videollamadas (Cal.com)"
        description="Agenda de reuniones virtuales sincronizadas con Cal.com API v2, enlaces de videollamada en 1 clic y confirmación por SMS de Zadarma."
      />
      <CitasOnlineClient
        calcom={calcom}
        hub={hub}
        canManage={canManage}
        canConfigure={canConfigure}
      />
    </div>
  )
}
