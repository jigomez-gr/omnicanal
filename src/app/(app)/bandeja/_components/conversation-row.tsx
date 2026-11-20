"use client";

import { Bot, Mail, MailCheck, Siren } from "lucide-react";
import Link from "next/link";
import { useTransition, type MouseEvent } from "react";
import { toast } from "sonner";
import type { ConversationListItem } from "@/data/conversations";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markConversationReadAction, markConversationUnreadAction } from "../actions";
import { AI_STATE_META, aiStateOf, CONTENT_TYPE_LABELS, conversationDisplayName, formatConversationFullDate, STATUS_META } from "../_lib/presentation";
import { ChannelMark, ContactAvatar, PersonAvatar } from "./contact-avatar";

const MAX_LABELS_SHOWN = 2;

type ConversationRowProps = { item: ConversationListItem; href: string; selected: boolean; timezone: string; now: Date };

/**
 * One conversation in the list (DESIGN.md «Fila de la lista»): contact and channel, last message, time, unread,
 * «Pendiente de humano» (always visible), urgent hand-offs highlighted ([TRA-07]), mode, labels and assignee.
 */
export function ConversationRow({ item, href, selected, timezone, now }: ConversationRowProps) {
  const [pending, startTransition] = useTransition();
  const dateRef = item.lastMessageAt || item.createdAt;
  const name = conversationDisplayName(item.contact?.name, dateRef, timezone);
  const fullDate = formatConversationFullDate(dateRef, timezone);
  const unread = item.unreadCount > 0;
  const ai = aiStateOf(item, now);
  const mode = AI_STATE_META[ai.kind];
  const ModeIcon = mode.icon;
  const last = item.lastMessage;
  const preview = last ? (last.preview ?? CONTENT_TYPE_LABELS[last.contentType]) : "Sin mensajes";
  const status = item.status === "open" ? null : STATUS_META[item.status];
  const StatusIcon = status?.icon;

  function toggleUnread(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const res = unread
        ? await markConversationReadAction({ conversationId: item.id })
        : await markConversationUnreadAction({ conversationId: item.id });
      if (!res.ok) {
        toast.error(res.error || "No se pudo actualizar el estado.");
      }
    });
  }

  return (
    <li>
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "relative flex gap-3 border-b px-4 py-3 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          selected && "bg-primary-soft before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary hover:bg-primary-soft",
        )}
      >
        <ContactAvatar name={item.contact?.name ?? null} channelType={item.channel.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")} title={name}>
              {name}
            </span>
            {item.lastMessageAt ? (
              <time dateTime={item.lastMessageAt.toISOString()} className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatRelative(item.lastMessageAt, timezone, now)}
              </time>
            ) : null}
          </div>
          {fullDate ? (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {fullDate}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <p className={cn("min-w-0 flex-1 truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
              {last?.direction === "outbound" && last.senderType === "ai" ? (
                <Bot role="img" aria-label="IA:" className="mr-1 inline size-3.5 align-[-2px] text-ai" />
              ) : null}
              {preview}
            </p>
            <button
              type="button"
              onClick={toggleUnread}
              disabled={pending}
              title={unread ? "Marcar como leída" : "Marcar como no leída"}
              aria-label={unread ? "Marcar como leída" : "Marcar como no leída"}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {unread ? <MailCheck className="size-3.5 text-primary" /> : <Mail className="size-3.5" />}
            </button>
            {unread ? (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">
                {item.unreadCount}
                <span className="sr-only"> sin leer</span>
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {/* First, whole type and cut name: which channel this conversation is in, at a glance ([BAN-17]). */}
            <ChannelMark type={item.channel.type} name={item.channel.name} variant="pill" className="max-w-[min(100%,14rem)]" />
            {item.urgent ? (
              <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-destructive-soft px-2 font-medium text-destructive-text">
                <Siren aria-hidden className="size-3" />
                Urgente
              </span>
            ) : null}
            {status && StatusIcon ? (
              <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-full px-2 font-medium", status.pill)}>
                <StatusIcon aria-hidden className="size-3" />
                {status.label}
              </span>
            ) : null}
            <span className={cn("inline-flex items-center gap-1", mode.className)}>
              <ModeIcon aria-hidden className="size-3" />
              {mode.label}
            </span>
            {item.labels.slice(0, MAX_LABELS_SHOWN).map((label) => (
              <span key={label} className="inline-flex h-5 max-w-24 items-center rounded-full border px-2 text-foreground">
                <span className="truncate">{label}</span>
              </span>
            ))}
            {item.labels.length > MAX_LABELS_SHOWN ? (
              <span title={item.labels.slice(MAX_LABELS_SHOWN).join(", ")}>+{item.labels.length - MAX_LABELS_SHOWN}</span>
            ) : null}
            {item.assignedUser ? (
              <span className="ml-auto inline-flex items-center gap-1">
                <span className="sr-only">Asignada a {item.assignedUser.name}</span>
                <PersonAvatar name={item.assignedUser.name} />
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
