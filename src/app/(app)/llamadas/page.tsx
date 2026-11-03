import type { Metadata } from "next"
import { noPermissionDescription } from "@/components/app-shell/navigation"
import { NoPermission } from "@/components/no-permission"
import { PageHeader } from "@/components/page-header"
import { getVapiAndCallsDashboard } from "@/data/flamenco"
import { can, PERMISSIONS } from "@/lib/permissions"
import { requirePageActor } from "@/server/session"
import { LlamadasClient } from "./_components/llamadas-client"

export const metadata: Metadata = {
  title: "Llamadas VAPI y SMS Zadarma · soniqueteflamenco.com",
}

export default async function LlamadasPage() {
  const actor = await requirePageActor({ next: "/llamadas" })
  if (!can(actor, PERMISSIONS.campaigns.view)) {
    return <NoPermission description={noPermissionDescription(actor.role)} />
  }

  const data = await getVapiAndCallsDashboard(actor)
  const canManage = can(actor, PERMISSIONS.campaigns.manage)
  const canConfigure = can(actor, PERMISSIONS.settings.integrations)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voz Telefónica (VAPI & Zadarma) y SMS"
        description="Registro de llamadas entrantes y salientes, grabaciones, transcripciones, Estudio de Voz IA (ElevenLabs + Deepgram + SIP Trunk Zadarma) y envíos SMS con firma HMAC-SHA1."
      />
      <LlamadasClient
        data={data}
        canManage={canManage}
        canConfigure={canConfigure}
      />
    </div>
  )
}
