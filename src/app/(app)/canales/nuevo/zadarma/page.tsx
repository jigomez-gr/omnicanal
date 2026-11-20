import type { Metadata } from "next";
import { noPermissionDescription } from "@/components/app-shell/navigation";
import { NoPermission } from "@/components/no-permission";
import { PageHeader } from "@/components/page-header";
import { can, PERMISSIONS } from "@/lib/permissions";
import { requirePageActor } from "@/server/session";
import { zadarmaWebhookUrl } from "@/server/channels/zadarma/config";
import { ZadarmaWizard } from "./_components/zadarma-wizard";

export const metadata: Metadata = { title: "Conectar Zadarma · Canales" };

export default async function NewZadarmaChannelPage() {
  const actor = await requirePageActor({ next: "/canales/nuevo/zadarma" });
  if (!can(actor, PERMISSIONS.channels.manage)) return <NoPermission description={noPermissionDescription(actor.role)} />;

  const webhookUrl = zadarmaWebhookUrl();

  return (
    <>
      <PageHeader
        title="Conectar Zadarma SMS"
        description="Configura la pasarela SMS de Zadarma para enviar y recibir mensajes de texto directamente desde tus conversaciones."
      />
      <ZadarmaWizard webhookUrl={webhookUrl} />
    </>
  );
}
