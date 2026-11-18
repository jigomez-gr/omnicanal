// What the prompt needs from the database ([MOT-07]): business profile, opening hours, closures, active services
// and the agent's context files. System reads for the reply engine and «Probar agente» (callers check permissions).
import "server-only";
import { asc, eq } from "drizzle-orm";
import { loadBusinessHours } from "@/data/business-hours";
import { loadBusinessSettings } from "@/data/settings";
import { db } from "@/db";
import { agentContextFiles, closures, services } from "@/db/schema";
import type { PromptBusiness, PromptClosure, PromptContextFile, PromptHoursRange, PromptService } from "./prompt";

export type PromptBusinessData = {
  business: PromptBusiness;
  hours: PromptHoursRange[];
  closures: PromptClosure[];
  services: PromptService[];
  timezone: string;
  /** Default AI notice of the business ([CUM-01]); a channel may override it. */
  aiDisclosureText: string | null;
};

export async function loadPromptBusinessData(): Promise<PromptBusinessData> {
  const settings = await loadBusinessSettings();
  const [hours, closureRows, serviceRows] = await Promise.all([
    loadBusinessHours(),
    db.select({ startDate: closures.startDate, endDate: closures.endDate, reason: closures.reason }).from(closures).orderBy(asc(closures.startDate)),
    db
      .select({
        id: services.id,
        name: services.name,
        category: services.category,
        durationMin: services.durationMin,
        price: services.price,
        descriptionForAgent: services.descriptionForAgent,
        serviceType: services.serviceType,
        description: services.description,
        eventDatesText: services.eventDatesText,
        scheduleText: services.scheduleText,
        flyerUrl: services.flyerUrl,
        flyerParticularUrl: services.flyerParticularUrl,
        videoUrl: services.videoUrl,
        videoParticularUrl: services.videoParticularUrl,
        textoespecifico: services.textoespecifico,
        fechaDesde: services.fechaDesde,
        fechaHasta: services.fechaHasta,
        sinfechadefinitiva: services.sinfechadefinitiva,
        textosinfechadefinitiva: services.textosinfechadefinitiva,
        sinpreciodefinitivo: services.sinpreciodefinitivo,
        textosinpreciodefinitivo: services.textosinpreciodefinitivo,
        paymentType: services.paymentType,
        externalPaymentUrl: services.externalPaymentUrl,
        allowedModalities: services.allowedModalities,
        requiresReason: services.requiresReason,
        reminderNotes: services.reminderNotes,
        minPeople: services.minPeople,
        maxPeople: services.maxPeople,
        minQuorum: services.minQuorum,
        requiresManualConfirmation: services.requiresManualConfirmation,
      })
      .from(services)
      .where(eq(services.active, true))
      .orderBy(asc(services.sortOrder), asc(services.name)),
  ]);
  return {
    business: {
      name: settings.name,
      sector: settings.sector,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      address: settings.address,
      website: settings.website,
      terminology: settings.terminology,
    },
    hours,
    closures: closureRows,
    services: serviceRows,
    timezone: settings.timezone,
    aiDisclosureText: settings.aiDisclosureText,
  };
}

/** Level 1 knowledge of an agent, whole, in creation order ([CON-01]). Empty until the knowledge phase adds files. */
export async function loadAgentContextFiles(agentId: string): Promise<PromptContextFile[]> {
  return db
    .select({ title: agentContextFiles.title, content: agentContextFiles.contentMd })
    .from(agentContextFiles)
    .where(eq(agentContextFiles.agentId, agentId))
    .orderBy(asc(agentContextFiles.createdAt));
}
