import type { Metadata } from "next"
import { noPermissionDescription } from "@/components/app-shell/navigation"
import { NoPermission } from "@/components/no-permission"
import { PageHeader } from "@/components/page-header"
import { getFlamencoHubSnapshot } from "@/data/flamenco"
import { can, PERMISSIONS } from "@/lib/permissions"
import { requirePageActor } from "@/server/session"
import { PromocionClient } from "./_components/promocion-client"

export const metadata: Metadata = {
  title: "Promoción Artística · soniqueteflamenco.com",
}

export default async function PromocionArtisticaPage() {
  const actor = await requirePageActor({ next: "/promocion" })
  if (!can(actor, PERMISSIONS.campaigns.view)) {
    return <NoPermission description={noPermissionDescription(actor.role)} />
  }

  const snapshot = await getFlamencoHubSnapshot(actor)
  const canManage = can(actor, PERMISSIONS.campaigns.manage)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promoción Artística · soniqueteflamenco.com"
        description="Intérpretes de flamenco, pack de 9 vídeos .mp4 y cartelería, salas de flamenco, salas de conciertos, ateneos, administración, simulador de ofertas hacia Envíos, captador web y servicios digitales para artistas."
      />
      <PromocionClient snapshot={snapshot} canManage={canManage} />
    </div>
  )
}
