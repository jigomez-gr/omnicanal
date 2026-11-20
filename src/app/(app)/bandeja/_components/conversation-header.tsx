"use client";

import { ArrowLeft, Download, FileArchive, FileSpreadsheet, FileText, LoaderCircle, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ConversationDetail, PersonRef } from "@/data/conversations";
import { exportConversationAction, markConversationReadAction, markConversationUnreadAction } from "../actions";
import { inboxHref, parseInboxQuery } from "../_lib/filters";
import { conversationDisplayName, formatConversationFullDate } from "../_lib/presentation";
import { AiControl } from "./ai-control";
import { ChannelMark, ContactAvatar } from "./contact-avatar";
import { ContactPanelToggle } from "./contact-panel-frame";
import { AgentControl, AssignControl, HandoffButton, LabelsControl, StatusControl } from "./header-controls";

function triggerDownload(base64: string, fileName: string, contentType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ConversationHeaderProps = {
  conversation: ConversationDetail;
  assignable: PersonRef[];
  agents: PersonRef[];
  channelAgent: PersonRef | null;
  permissions: { pauseAi: boolean; manage: boolean; assign: boolean; claim: boolean; changeAgent: boolean };
  userId: string;
  timezone: string;
  now: Date;
};

/**
 * Contact and channel («WhatsApp · Recepción»), the AI switch with its reason, status, «Pasar a una persona»,
 * assignment, the conversation's agent and labels (DESIGN.md «Cabecera de la conversación»). Solo lectura sees the
 * same states without the controls ([PER-03]).
 */
export function ConversationHeader({ conversation, assignable, agents, channelAgent, permissions, userId, timezone, now }: ConversationHeaderProps) {
  const searchParams = useSearchParams();
  const backHref = inboxHref("/bandeja", parseInboxQuery(searchParams));
  const title = conversationDisplayName(conversation.contact?.name, conversation.lastMessageAt, timezone);
  const fullDate = formatConversationFullDate(conversation.lastMessageAt, timezone);

  const [unreadPending, startUnreadTransition] = useTransition();
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const unread = conversation.unreadCount > 0;

  function toggleUnread() {
    startUnreadTransition(async () => {
      const res = unread
        ? await markConversationReadAction({ conversationId: conversation.id })
        : await markConversationUnreadAction({ conversationId: conversation.id });
      if (!res.ok) {
        toast.error(res.error || "No se pudo actualizar el estado de lectura.");
      }
    });
  }

  async function handleExport(format: "pdf" | "xlsx" | "csv" | "zip") {
    if (exportingFormat) return;
    setExportingFormat(format);
    setShowExportMenu(false);
    try {
      const res = await exportConversationAction({ conversationId: conversation.id, format });
      if (!res.ok) {
        toast.error(res.error || "Error al exportar la conversación.");
        return;
      }
      if (res.data) {
        triggerDownload(res.data.base64, res.data.fileName, res.data.contentType);
        toast.success(`Exportación ${format.toUpperCase()} descargada con éxito.`);
      }
    } catch {
      toast.error("Error al generar la exportación.");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <header className="flex flex-col gap-2 border-b px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Shown while the list is not next to the conversation (the inbox shell decides, by its own width). */}
        <Button asChild variant="ghost" size="icon" className="-ml-2 @min-[45rem]/inbox:hidden">
          <Link href={backHref} aria-label="Atrás, a la bandeja">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <ContactAvatar name={conversation.contact?.name ?? null} channelType={conversation.channel.type} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold" title={title}>
            {title}
          </h1>
          <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <ChannelMark type={conversation.channel.type} name={conversation.channel.name} />
            {fullDate ? <span className="tabular-nums">· {fullDate}</span> : null}
            {conversation.channel.isDemo ? <span className="shrink-0 rounded-full bg-info-soft px-2 py-px font-medium text-info">Demo</span> : null}
            {conversation.channel.status === "disabled" ? <span className="shrink-0">· Canal desactivado</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleUnread}
            disabled={unreadPending}
            title={unread ? "Marcar conversación como leída" : "Marcar como no leída"}
            className="gap-1.5 text-xs"
          >
            {unread ? <MailCheck className="size-3.5 text-primary" /> : <Mail className="size-3.5" />}
            <span className="hidden sm:inline">{unread ? "Marcar leído" : "Marcar no leído"}</span>
          </Button>

          <Popover open={showExportMenu} onOpenChange={setShowExportMenu}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(exportingFormat)}
                title="Exportar conversación a PDF, Excel, CSV o ZIP con archivos adjuntos"
                className="gap-1.5 text-xs"
              >
                {exportingFormat ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                <span>{exportingFormat ? exportingFormat.toUpperCase() : "Exportar"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Exportar conversación</div>
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <FileText className="size-4 text-rose-600" />
                <div>
                  <div className="font-medium">PDF (.pdf)</div>
                  <div className="text-[10px] text-muted-foreground">Documento maquetado</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleExport("xlsx")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <div>
                  <div className="font-medium">Excel (.xlsx)</div>
                  <div className="text-[10px] text-muted-foreground">Hoja de cálculo</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <FileText className="size-4 text-sky-600" />
                <div>
                  <div className="font-medium">CSV (.csv)</div>
                  <div className="text-[10px] text-muted-foreground">Datos tabulares</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleExport("zip")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <FileArchive className="size-4 text-amber-600" />
                <div>
                  <div className="font-medium">ZIP completo (.zip)</div>
                  <div className="text-[10px] text-muted-foreground">Historial + archivos adjuntos</div>
                </div>
              </button>
            </PopoverContent>
          </Popover>

          <ContactPanelToggle />
        </div>
      </div>
      {/* Who answers comes first and whole. On a phone the rest follows in a strip that scrolls sideways, starting with
          the status: next to a short «La IA responde», under a longer state. From tablets up everything wraps as one
          row. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-y-1">
        <AiControl
          conversationId={conversation.id}
          aiMode={conversation.aiMode}
          aiPausedUntil={conversation.aiPausedUntil}
          pauseReason={conversation.pauseReason}
          canChange={permissions.pauseAi}
          timezone={timezone}
          initialNow={now}
        />
        <div className="-mr-4 flex min-w-40 flex-1 items-center gap-3 overflow-x-auto pr-4 pb-1 md:contents">
          <StatusControl conversationId={conversation.id} status={conversation.status} canChange={permissions.manage} />
          {permissions.manage && conversation.status !== "pending_human" ? <HandoffButton conversationId={conversation.id} /> : null}
          <AssignControl
            conversationId={conversation.id}
            assignedUser={conversation.assignedUser}
            assignable={assignable}
            userId={userId}
            canAssign={permissions.assign}
            canClaim={permissions.claim}
          />
          <AgentControl
            conversationId={conversation.id}
            agent={conversation.agent}
            agentOverride={conversation.agentOverride}
            channelAgent={channelAgent}
            agents={agents}
            canChange={permissions.changeAgent}
          />
          <LabelsControl conversationId={conversation.id} labels={conversation.labels} canChange={permissions.manage} />
        </div>
      </div>
    </header>
  );
}
