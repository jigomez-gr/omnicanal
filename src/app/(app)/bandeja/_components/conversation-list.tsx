"use client";

import { Download, FileSpreadsheet, FileText, FlaskConical, Inbox, LoaderCircle, RadioTower, RefreshCw, Search, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ConversationListItem, InboxCounts } from "@/data/conversations";
import { useRealtime, useRealtimeStatus, type RealtimeEvent } from "@/hooks/use-realtime";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportConversationListAction, loadInboxAction } from "../actions";
import {
  activeFilterCount,
  clearFilters,
  inboxHref,
  inboxQueryString,
  parseInboxQuery,
  toConversationFilters,
  type InboxPeriod,
  type InboxQuery,
  type InboxReadState,
  type InboxSearchField,
  type InboxView,
} from "../_lib/filters";
import { ConversationRow } from "./conversation-row";
import { InboxFilters, CHANNEL_TYPE_LABELS, type InboxChannel } from "./inbox-filters";
import { ListSkeleton } from "./list-skeleton";
import { useNow } from "./use-now";

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

const INBOX_PATH = "/bandeja";
const PAGE_SIZE = 30;
/** The server answers at most this many per page. */
const MAX_PAGE = 100;
const SEARCH_DELAY_MS = 300;
/** News often come in bursts (message + status + read): one reload for all of them. */
const RELOAD_DELAY_MS = 400;

const TABS: { view: InboxView; label: string; count?: keyof InboxCounts }[] = [
  { view: "all", label: "Todas" },
  { view: "pending", label: "Pendientes de humano", count: "pendingHuman" },
  { view: "mine", label: "Mías", count: "mine" },
];

type Loaded = { key: string; items: ConversationListItem[]; nextCursor: string | null; counts: InboxCounts };

type ConversationListProps = {
  channels: InboxChannel[];
  timezone: string;
  initialNow: Date;
  canConnectChannel: boolean;
  canUseSimulator: boolean;
};

/**
 * The inbox list ([BAN-01]–[BAN-03]): quick tabs, search and filters in the URL, unread counters, and what changes
 * appears on its own through /api/realtime without losing what is loaded. «Sin conexión. Reintentando…» keeps the list.
 */
export function ConversationList({ channels, timezone, initialNow, canConnectChannel, canUseSimulator }: ConversationListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = useParams<{ id?: string }>().id ?? null;
  const now = useNow(initialNow);
  const connection = useRealtimeStatus();

  const query = useMemo(() => parseInboxQuery(searchParams), [searchParams]);
  const key = inboxQueryString(query);
  // Keyed by the URL text: opening a conversation keeps the same filters and does not reload the list.
  const filters = useMemo(() => toConversationFilters(parseInboxQuery(new URLSearchParams(key))), [key]);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  /** The first page of the current filters: an answer for older filters is dropped. */
  const request = useRef(0);
  /** Reloads of what is shown, counted apart: a reload never cancels the first page of new filters. */
  const reloadRequest = useRef(0);
  const current = useRef<Loaded | null>(null);
  const latestKey = useRef(key);
  useEffect(() => {
    current.current = loaded;
    latestKey.current = key;
  });

  // First page of each filter combination.
  useEffect(() => {
    const id = ++request.current;
    loadInboxAction({ ...filters, limit: PAGE_SIZE }).then(
      (result) => {
        if (id !== request.current) return;
        if (result.ok && result.data) {
          setLoaded({ key, items: result.data.page.items, nextCursor: result.data.page.nextCursor, counts: result.data.counts });
          setFailedKey(null);
        } else setFailedKey(key);
      },
      () => {
        if (id === request.current) setFailedKey(key);
      },
    );
  }, [key, filters, retries]);

  // News: reload what is already shown (same filters, as many rows as loaded), without a skeleton. A reload only
  // applies while its filters are still the ones on screen: typing a search meanwhile never leaves the list loading.
  const reloadTimer = useRef<number | null>(null);
  const reload = useCallback(() => {
    if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(() => {
      reloadTimer.current = null;
      const shown = current.current;
      if (!shown || shown.key !== key || latestKey.current !== key) return;
      const id = ++reloadRequest.current;
      const limit = Math.min(MAX_PAGE, Math.max(PAGE_SIZE, shown.items.length));
      loadInboxAction({ ...filters, limit }).then(
        (result) => {
          if (id !== reloadRequest.current || latestKey.current !== key || !result.ok || !result.data) return;
          setLoaded({ key, items: result.data.page.items, nextCursor: result.data.page.nextCursor, counts: result.data.counts });
        },
        // A failed reload keeps the list; the connection notice already says it is retrying.
        () => undefined,
      );
    }, RELOAD_DELAY_MS);
  }, [key, filters]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    const shown = current.current;
    const limit = Math.min(MAX_PAGE, Math.max(PAGE_SIZE, shown?.items.length ?? PAGE_SIZE));
    loadInboxAction({ ...filters, limit }).then(
      (result) => {
        setRefreshing(false);
        if (result.ok && result.data) {
          setLoaded({ key, items: result.data.page.items, nextCursor: result.data.page.nextCursor, counts: result.data.counts });
          toast.success("Bandeja actualizada");
        } else {
          toast.error("No se pudo actualizar");
        }
      },
      () => {
        setRefreshing(false);
        toast.error("No se pudo actualizar");
      },
    );
  };

  const handleListExport = async (format: "xlsx" | "csv" | "pdf") => {
    if (exportingFormat) return;
    setExportingFormat(format);
    setShowExportMenu(false);
    try {
      const filterSummary = [
        query.period !== "all" ? `Periodo: ${query.period}` : null,
        query.readState !== "all" ? `Estado: ${query.readState}` : null,
        query.channelType ? `Canal: ${CHANNEL_TYPE_LABELS[query.channelType] ?? query.channelType}` : null,
        query.search ? `Búsqueda: ${query.search}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await exportConversationListAction({
        format,
        filters,
        filterInfo: filterSummary || "Todas las conversaciones",
      });

      if (!res.ok) {
        toast.error(res.error || "Error al exportar la lista.");
        return;
      }

      if (res.data) {
        triggerDownload(res.data.base64, res.data.fileName, res.data.contentType);
        toast.success(`Listado ${format.toUpperCase()} descargado con éxito.`);
      }
    } catch {
      toast.error("Error al exportar el listado.");
    } finally {
      setExportingFormat(null);
    }
  };

  // New filters (or leaving): a reload still waiting for the old ones is dropped.
  useEffect(
    () => () => {
      if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current);
      reloadTimer.current = null;
    },
    [key],
  );
  useRealtime((events: RealtimeEvent[]) => {
    if (events.some((event) => event.type !== "notification.created")) reload();
  });

  async function loadMore() {
    const shown = current.current;
    if (!shown?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await loadInboxAction({ ...filters, cursor: shown.nextCursor, limit: PAGE_SIZE });
      if (result.ok && result.data && current.current?.key === shown.key) {
        const page = result.data.page;
        setLoaded((previous) => {
          if (!previous || previous.key !== shown.key) return previous;
          const ids = new Set(previous.items.map((item) => item.id));
          return { ...previous, items: [...previous.items, ...page.items.filter((item) => !ids.has(item.id))], nextCursor: page.nextCursor, counts: result.data?.counts ?? previous.counts };
        });
      } else if (!result.ok) toast.error(result.error);
    } catch {
      toast.error("No se han podido cargar más conversaciones. Inténtalo de nuevo.");
    } finally {
      setLoadingMore(false);
    }
  }

  const navigate = useCallback((next: InboxQuery) => router.replace(inboxHref(pathname, next), { scroll: false }), [router, pathname]);

  const view = loaded?.key === key ? loaded : null;
  const failed = failedKey === key && !view;
  const filtered = activeFilterCount(query) > 0 || query.search !== "";
  // One H1 per page: the conversation has its own when one is open.
  const Heading = selectedId ? "h2" : "h1";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2.5 border-b px-4 pt-3.5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <Heading className="text-base font-semibold tracking-tight">Conversaciones</Heading>
            {view ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {view.items.length}
              </span>
            ) : null}
            {view && view.counts.unreadConversations > 0 ? (
              <span className="text-xs font-semibold text-primary tabular-nums">
                ({formatNumber(view.counts.unreadConversations)} sin leer)
              </span>
            ) : null}
          </div>

          {/* Export button */}
          <Popover open={showExportMenu} onOpenChange={setShowExportMenu}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(exportingFormat)}
                title="Exportar listado según los filtros actuales"
                className="gap-1.5 text-xs h-8"
              >
                {exportingFormat ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                <span>Exportar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-1.5">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Exportar resultado</div>
              <button
                type="button"
                onClick={() => handleListExport("xlsx")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <div>
                  <div className="font-medium">Excel (.xlsx)</div>
                  <div className="text-[10px] text-muted-foreground">Listado con formato</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleListExport("csv")}
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
                onClick={() => handleListExport("pdf")}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent"
              >
                <FileText className="size-4 text-rose-600" />
                <div>
                  <div className="font-medium">PDF (.pdf)</div>
                  <div className="text-[10px] text-muted-foreground">Informe para imprimir</div>
                </div>
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search bar with Re-execute button and Scope selector */}
        <SearchBox
          query={query}
          refreshing={refreshing}
          onSearch={(search) => navigate({ ...query, search })}
          onRefresh={handleManualRefresh}
          onSearchFieldChange={(searchField) => navigate({ ...query, searchField })}
        />

        {/* Quick parameters: Periodo y Estado */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Periodo
            </label>
            <select
              value={query.period}
              onChange={(e) => navigate({ ...query, period: e.target.value as InboxPeriod })}
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Estado
            </label>
            <select
              value={query.readState}
              onChange={(e) => {
                const next = e.target.value as InboxReadState;
                navigate({ ...query, readState: next, unread: next === "unread" });
              }}
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="unread">Sin leer</option>
              <option value="read">Leídas</option>
            </select>
          </div>
        </div>

        {/* Quick channel pills */}
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            Canal
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => navigate({ ...query, channelType: null, channelId: null })}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                !query.channelType && !query.channelId
                  ? "border-primary bg-primary-soft text-primary font-semibold"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              Todas
            </button>
            {[
              { id: "whatsapp", label: "WhatsApp" },
              { id: "email", label: "Email" },
              { id: "web_chat", label: "Web Landing" },
              { id: "call", label: "Llamadas" },
              { id: "sms", label: "SMS" },
              { id: "instagram", label: "Instagram" },
              { id: "telegram", label: "Telegram" },
            ].map((pill) => {
              const active =
                query.channelType === pill.id ||
                (pill.id === "call" && query.channelType === "phone_vapi") ||
                (pill.id === "sms" && query.channelType === "sms_zadarma") ||
                (pill.id === "web_chat" && query.channelType === "webchat") ||
                (pill.id === "telegram" && query.channelType === "telegram");
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => navigate({ ...query, channelType: active ? null : pill.id, channelId: null })}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    active
                      ? "border-primary bg-primary-soft text-primary font-semibold"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick tabs (Todas, Pendientes de humano, Mías) */}
        <nav aria-label="Vistas de la bandeja" className="-mb-2 flex gap-1 overflow-x-auto pt-1">
          {TABS.map((tab) => {
            const active = query.view === tab.view;
            const count = tab.count && view ? view.counts[tab.count] : 0;
            return (
              <Link
                key={tab.view}
                href={inboxHref(pathname, { ...query, view: tab.view })}
                replace
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 border-b-2 px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-10",
                  active ? "border-primary text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {count > 0 ? <span className="rounded-full bg-muted px-1.5 text-[10px] text-foreground tabular-nums">{formatNumber(count)}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-b px-4 py-2">
        <InboxFilters query={query} channels={channels} onChange={navigate} />
      </div>
      {connection === "offline" ? (
        <p role="status" className="flex items-center gap-2 border-b bg-warning-soft px-4 py-2 text-sm text-warning">
          <WifiOff aria-hidden className="size-4" />
          Sin conexión. Reintentando…
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {failed ? (
          <div className="p-4">
            <ErrorState
              title="No se ha podido cargar la bandeja"
              retry={
                <Button variant="outline" size="sm" onClick={() => setRetries((value) => value + 1)}>
                  Reintentar
                </Button>
              }
            />
          </div>
        ) : !view ? (
          <ListSkeleton />
        ) : view.items.length === 0 ? (
          <div className="p-4">
            <ListEmpty
              query={query}
              filtered={filtered}
              hasChannels={channels.length > 0}
              canConnectChannel={canConnectChannel}
              canUseSimulator={canUseSimulator}
              onClear={() => navigate({ ...clearFilters(query), view: "all" })}
            />
          </div>
        ) : (
          <>
            <ul aria-label="Conversaciones">
              {view.items.map((item) => (
                <ConversationRow
                  key={item.id}
                  item={item}
                  href={inboxHref(`${INBOX_PATH}/${item.id}`, query)}
                  selected={item.id === selectedId}
                  timezone={timezone}
                  now={now}
                />
              ))}
            </ul>
            {view.nextCursor ? (
              <div className="flex justify-center p-4">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" /> : null}
                  {loadingMore ? "Cargando…" : "Cargar más"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** Search by contact or text with field selector and re-execute button. */
function SearchBox({
  query,
  refreshing,
  onSearch,
  onRefresh,
  onSearchFieldChange,
}: {
  query: InboxQuery;
  refreshing: boolean;
  onSearch: (search: string) => void;
  onRefresh: () => void;
  onSearchFieldChange: (field: InboxSearchField) => void;
}) {
  const [text, setText] = useState(query.search);
  const [urlSearch, setUrlSearch] = useState(query.search);

  if (query.search !== urlSearch) {
    setUrlSearch(query.search);
    if (query.search !== text.trim()) setText(query.search);
  }
  const latest = useRef(onSearch);
  useEffect(() => {
    latest.current = onSearch;
  });
  useEffect(() => {
    const value = text.trim();
    if (value === urlSearch) return;
    const id = window.setTimeout(() => latest.current(value), SEARCH_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [text, urlSearch]);

  const placeholder =
    query.searchField === "phone"
      ? "Buscar por teléfono..."
      : query.searchField === "email"
        ? "Buscar por email..."
        : query.searchField === "name"
          ? "Buscar por nombre..."
          : "Buscar por móvil, email, nombre o mensaje...";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            aria-label="Buscar conversaciones"
            maxLength={100}
            className="pl-8 pr-7 h-8 text-xs"
          />
          {text ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                onSearch("");
              }}
              title="Borrar búsqueda"
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          title="Reejecutar búsqueda y refrescar lista"
          className="h-8 gap-1 px-2.5 text-xs font-semibold shrink-0"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          <span>Reejecutar</span>
        </Button>
      </div>

      {/* Scope selector */}
      <div className="flex items-center gap-1 text-[11px]">
        <span className="text-muted-foreground text-[10px] mr-0.5">Buscar en:</span>
        {(
          [
            { id: "all", label: "Todos" },
            { id: "phone", label: "Móvil" },
            { id: "email", label: "Email" },
            { id: "name", label: "Nombre" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSearchFieldChange(f.id)}
            className={cn(
              "rounded px-1.5 py-0.5 font-medium transition-colors text-[10px]",
              query.searchField === f.id
                ? "bg-primary-soft text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type ListEmptyProps = {
  query: InboxQuery;
  filtered: boolean;
  hasChannels: boolean;
  canConnectChannel: boolean;
  canUseSimulator: boolean;
  onClear: () => void;
};

function ListEmpty({ query, filtered, hasChannels, canConnectChannel, canUseSimulator, onClear }: ListEmptyProps) {
  if (filtered) {
    return (
      <EmptyState
        icon={Search}
        title="Nada coincide con estos filtros"
        action={
          <Button variant="outline" onClick={onClear}>
            Quitar filtros
          </Button>
        }
      />
    );
  }
  if (query.view === "pending") return <EmptyState icon={Inbox} title="No hay conversaciones pendientes de humano" description="Cuando la IA pase una conversación a una persona, aparecerá aquí." />;
  if (query.view === "mine") return <EmptyState icon={Inbox} title="No tienes conversaciones asignadas" description="Las que te asignen o tomes tú aparecerán aquí." />;
  return (
    <EmptyState
      icon={Inbox}
      title="Todavía no hay conversaciones"
      description="Cuando un cliente escriba por cualquiera de tus canales, aparecerá aquí."
      action={
        canConnectChannel || canUseSimulator ? (
          <div className="flex flex-wrap justify-center gap-2">
            {canConnectChannel && !hasChannels ? (
              <Button asChild>
                <Link href="/canales/nuevo">
                  <RadioTower aria-hidden />
                  Conectar un canal
                </Link>
              </Button>
            ) : null}
            {canUseSimulator ? (
              <Button asChild variant="outline">
                <Link href="/ajustes/diagnostico/simulador">
                  <FlaskConical aria-hidden />
                  Probar con el simulador
                </Link>
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}

