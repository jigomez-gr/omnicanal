import type { Metadata } from "next";
import { noPermissionDescription } from "@/components/app-shell/navigation";
import { NoPermission } from "@/components/no-permission";
import { PageHeader } from "@/components/page-header";
import { can, PERMISSIONS } from "@/lib/permissions";
import { requirePageActor } from "@/server/session";
import { vapiWebhookUrl } from "@/server/channels/vapi/config";
import { VapiWizard } from "./_components/vapi-wizard";

export const metadata: Metadata = { title: "Conectar Vapi · Canales" };

export default async function NewVapiChannelPage() {
  const actor = await requirePageActor({ next: "/canales/nuevo/vapi" });
  if (!can(actor, PERMISSIONS.channels.manage)) return <NoPermission description={noPermissionDescription(actor.role)} />;

  const webhookUrl = vapiWebhookUrl();

  return (
    <>
      <PageHeader
        title="Conectar Vapi"
        description="Configura la integración con el asistente de voz de Vapi para recibir y emitir llamadas automáticas."
      />
      <VapiWizard webhookUrl={webhookUrl} />
    </>
  );
}
