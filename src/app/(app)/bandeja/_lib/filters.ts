// Inbox filters and quick tabs in the URL, in Spanish (docs/pantallas.md: «?estado=pendiente»), so a view can be
// shared and «Atrás» works ([BAN-02]). Pure: the list reads them in the browser; the server validates them again.
import { idSchema, labelSchema, MAX_LABELS } from "@/lib/validation";

export type InboxView = "all" | "pending" | "mine";
export type InboxStatus = "open" | "pending_human" | "resolved";
export type InboxMode = "ai" | "human" | "paused";
export type InboxAssignee = "me" | "unassigned";
export type InboxPeriod = "all" | "today" | "7d" | "30d";
export type InboxReadState = "all" | "unread" | "read";
export type InboxSearchField = "all" | "phone" | "email" | "name";

export type InboxQuery = {
  view: InboxView;
  channelId: string | null;
  channelType: string | null;
  status: InboxStatus | null;
  assignee: InboxAssignee | null;
  mode: InboxMode | null;
  unread: boolean;
  period: InboxPeriod;
  readState: InboxReadState;
  searchField: InboxSearchField;
  labels: string[];
  search: string;
};

/** What the list asks the server for (src/data/conversations.ts › conversationFiltersSchema). */
export type ConversationFilterInput = {
  channelId?: string;
  channelType?: string;
  status?: InboxStatus;
  assignee?: InboxAssignee;
  mode?: InboxMode;
  unread?: true;
  period?: InboxPeriod;
  readState?: InboxReadState;
  searchField?: InboxSearchField;
  labels?: string[];
  search?: string;
  limit?: number;
};

export const EMPTY_QUERY: InboxQuery = {
  view: "all",
  channelId: null,
  channelType: null,
  status: null,
  assignee: null,
  mode: null,
  unread: false,
  period: "all",
  readState: "all",
  searchField: "all",
  labels: [],
  search: "",
};

const MAX_SEARCH = 100;

const PARAM = {
  view: "vista",
  channel: "canal",
  channelType: "tipo_canal",
  status: "estado",
  assignee: "asignado",
  mode: "modo",
  unread: "sinleer",
  period: "periodo",
  readState: "leido",
  searchField: "campo",
  label: "etiqueta",
  search: "q",
} as const;

const VIEW_VALUES: Record<Exclude<InboxView, "all">, string> = { pending: "pendientes", mine: "mias" };
const STATUS_VALUES: Record<InboxStatus, string> = { open: "abierta", pending_human: "pendiente", resolved: "resuelta" };
const ASSIGNEE_VALUES: Record<InboxAssignee, string> = { me: "yo", unassigned: "nadie" };
const MODE_VALUES: Record<InboxMode, string> = { ai: "ia", human: "persona", paused: "pausa" };
const PERIOD_VALUES: Record<Exclude<InboxPeriod, "all">, string> = { today: "hoy", "7d": "7dias", "30d": "30dias" };
const READ_STATE_VALUES: Record<Exclude<InboxReadState, "all">, string> = { unread: "sinleer", read: "leidas" };
const SEARCH_FIELD_VALUES: Record<Exclude<InboxSearchField, "all">, string> = { phone: "movil", email: "email", name: "nombre" };

function fromParam<K extends string>(values: Record<K, string>, value: string | null): K | null {
  const entry = Object.entries(values).find(([, text]) => text === value);
  return entry ? (entry[0] as K) : null;
}

type ReadableParams = { get(name: string): string | null; getAll(name: string): string[] };

export function parseInboxQuery(params: ReadableParams): InboxQuery {
  const channel = params.get(PARAM.channel);
  const channelType = params.get(PARAM.channelType);
  const labels: string[] = [];
  for (const raw of params.getAll(PARAM.label)) {
    const label = labelSchema.safeParse(raw);
    if (label.success && !labels.includes(label.data) && labels.length < MAX_LABELS) labels.push(label.data);
  }
  const readStateParam = fromParam(READ_STATE_VALUES, params.get(PARAM.readState));
  const unreadFlag = params.get(PARAM.unread) === "1" || readStateParam === "unread";
  const readState: InboxReadState = readStateParam ?? "all";

  return {
    view: fromParam(VIEW_VALUES, params.get(PARAM.view)) ?? "all",
    channelId: channel && idSchema.safeParse(channel).success ? channel : null,
    channelType: channelType && channelType !== "all" ? channelType : null,
    status: fromParam(STATUS_VALUES, params.get(PARAM.status)),
    assignee: fromParam(ASSIGNEE_VALUES, params.get(PARAM.assignee)),
    mode: fromParam(MODE_VALUES, params.get(PARAM.mode)),
    unread: unreadFlag,
    period: fromParam(PERIOD_VALUES, params.get(PARAM.period)) ?? "all",
    readState,
    searchField: fromParam(SEARCH_FIELD_VALUES, params.get(PARAM.searchField)) ?? "all",
    labels,
    search: (params.get(PARAM.search) ?? "").trim().slice(0, MAX_SEARCH),
  };
}

/** The query string (without «?»), in a fixed order and without defaults. */
export function inboxQueryString(query: InboxQuery): string {
  const params = new URLSearchParams();
  if (query.view !== "all") params.set(PARAM.view, VIEW_VALUES[query.view]);
  if (query.channelId) params.set(PARAM.channel, query.channelId);
  if (query.channelType && query.channelType !== "all") params.set(PARAM.channelType, query.channelType);
  if (query.status) params.set(PARAM.status, STATUS_VALUES[query.status]);
  if (query.assignee) params.set(PARAM.assignee, ASSIGNEE_VALUES[query.assignee]);
  if (query.mode) params.set(PARAM.mode, MODE_VALUES[query.mode]);
  if (query.unread) params.set(PARAM.unread, "1");
  if (query.period !== "all") params.set(PARAM.period, PERIOD_VALUES[query.period]);
  if (query.readState !== "all") params.set(PARAM.readState, READ_STATE_VALUES[query.readState]);
  if (query.searchField !== "all") params.set(PARAM.searchField, SEARCH_FIELD_VALUES[query.searchField]);
  for (const label of query.labels) params.append(PARAM.label, label);
  if (query.search) params.set(PARAM.search, query.search);
  return params.toString();
}

/** A path of the inbox that keeps the current filters. */
export function inboxHref(path: string, query: InboxQuery): string {
  const text = inboxQueryString(query);
  return text ? `${path}?${text}` : path;
}

/** Filters for the server; the quick tabs win over the same filter. */
export function toConversationFilters(query: InboxQuery): ConversationFilterInput {
  const filters: ConversationFilterInput = {};
  if (query.channelId) filters.channelId = query.channelId;
  if (query.channelType && query.channelType !== "all") filters.channelType = query.channelType;
  const status = query.view === "pending" ? "pending_human" : query.status;
  if (status) filters.status = status;
  const assignee = query.view === "mine" ? "me" : query.assignee;
  if (assignee) filters.assignee = assignee;
  if (query.mode) filters.mode = query.mode;
  if (query.unread || query.readState === "unread") filters.unread = true;
  if (query.readState && query.readState !== "all") filters.readState = query.readState;
  if (query.period && query.period !== "all") filters.period = query.period;
  if (query.searchField && query.searchField !== "all") filters.searchField = query.searchField;
  if (query.labels.length > 0) filters.labels = query.labels;
  if (query.search) filters.search = query.search;
  return filters;
}

/** Filters set in the «Filtros» popover (the tab and the search box are not counted). */
export function activeFilterCount(query: InboxQuery): number {
  return (
    [query.channelId, query.channelType, query.status, query.assignee, query.mode].filter(Boolean).length +
    (query.unread || query.readState !== "all" ? 1 : 0) +
    (query.period !== "all" ? 1 : 0) +
    query.labels.length
  );
}

/** «Quitar filtros»: everything but the tab. */
export function clearFilters(query: InboxQuery): InboxQuery {
  return { ...EMPTY_QUERY, view: query.view };
}
