import { JAMF_PRESTAGE_KEYS, MDM_SERVER_KEYS, mdmLabel, prestageLabel } from "@/lib/constants";
import { auditEvent } from "@/lib/audit";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/http";
import { integrations } from "@/lib/integrations";
import type { DeviceRecord, IntegrationHealthStatus } from "@/lib/integrations/types";
import { ensureReferenceData } from "@/lib/services/reference-data";

const DEVICE_SELECT_LIMIT = 50;

function cleanSerial(serial: string) {
  return serial.trim().toUpperCase();
}

async function upsertDevice(device: DeviceRecord) {
  return prisma.deviceCache.upsert({
    where: { serial: cleanSerial(device.serial) },
    create: {
      serial: cleanSerial(device.serial),
      model: device.model,
      abmStatus: device.abmStatus,
      currentMdmServerKey: device.currentMdmServerKey,
      currentMdmServerName: device.currentMdmServerName,
      assignedServerId: device.assignedServerId,
      jamfStatus: device.jamfStatus,
      currentPrestageKey: device.currentPrestageKey,
      currentPrestageName: device.currentPrestageName,
      rawJson: device.rawJson,
      lastSyncedAt: new Date()
    },
    update: {
      model: device.model,
      abmStatus: device.abmStatus,
      currentMdmServerKey: device.currentMdmServerKey,
      currentMdmServerName: device.currentMdmServerName,
      assignedServerId: device.assignedServerId,
      jamfStatus: device.jamfStatus,
      currentPrestageKey: device.currentPrestageKey,
      currentPrestageName: device.currentPrestageName,
      rawJson: device.rawJson,
      lastSyncedAt: new Date()
    }
  });
}

export async function syncAbmCache(actor?: CurrentUser) {
  await ensureReferenceData();
  const { abm } = integrations();
  const devices = await abm.syncDevices();
  const saved = await Promise.all(devices.map(upsertDevice));

  if (actor) {
    await auditEvent({
      action: "ABM_SYNC",
      actor,
      status: "SUCCESS",
      details: { count: saved.length }
    });
  }

  return saved;
}

export async function searchDevices(query?: string) {
  await ensureReferenceData();
  const q = query?.trim().toUpperCase();
  if (!q) {
    const count = await prisma.deviceCache.count();
    if (count === 0) {
      await syncAbmCache();
    }
  }

  return prisma.deviceCache.findMany({
    where: q
      ? {
          serial: {
            contains: q
          }
        }
      : undefined,
    orderBy: [{ lastSyncedAt: "desc" }, { serial: "asc" }],
    take: DEVICE_SELECT_LIMIT
  });
}

export async function getDevice(serial: string) {
  await ensureReferenceData();
  const normalized = cleanSerial(serial);
  const cached = await prisma.deviceCache.findUnique({ where: { serial: normalized } });
  if (cached) {
    return cached;
  }

  const live = await integrations().abm.getDevice(normalized);
  if (!live) {
    throw new AppError(`Serienummer ${normalized} is niet gevonden`, 404, "DEVICE_NOT_FOUND");
  }

  return upsertDevice(live);
}

export async function assignMdmServer(serial: string, mdmServerKey: string, actor: CurrentUser) {
  await ensureReferenceData();
  const normalized = cleanSerial(serial);
  if (!MDM_SERVER_KEYS.has(mdmServerKey)) {
    throw new AppError("Onbekende MDM-server", 400, "UNKNOWN_MDM_SERVER");
  }

  const target = await prisma.mdmServerMap.findUnique({ where: { key: mdmServerKey } });
  if (!target || !target.isAssignable) {
    throw new AppError("MDM-server is niet beschikbaar voor assignment", 400, "MDM_NOT_ASSIGNABLE");
  }

  const mutation = await prisma.mutation.create({
    data: {
      type: "MDM_ASSIGNMENT",
      serial: normalized,
      status: "RUNNING",
      requestedByEmail: actor.email,
      requestedByName: actor.name,
      targetKey: target.key,
      targetLabel: target.displayName
    }
  });

  try {
    const liveDevice = await integrations().abm.getDevice(normalized);
    if (!liveDevice) {
      throw new AppError(`Serienummer ${normalized} is niet gevonden in ABM`, 404, "DEVICE_NOT_FOUND");
    }

    await upsertDevice(liveDevice);
    const result = await integrations().abm.assignMdmServer(normalized, target);
    const updatedDevice = await prisma.deviceCache.update({
      where: { serial: normalized },
      data: {
        abmStatus: "ASSIGNED",
        currentMdmServerKey: target.key,
        currentMdmServerName: target.displayName,
        assignedServerId: target.appleServerId,
        jamfStatus: target.isJamf ? "IN_SCOPE" : "NOT_ON_JAMF",
        currentPrestageKey: target.isJamf ? undefined : null,
        currentPrestageName: target.isJamf ? undefined : null,
        lastSyncedAt: new Date()
      }
    });
    const audit = await auditEvent({
      action: "MDM_ASSIGNMENT",
      serial: normalized,
      actor,
      targetKey: target.key,
      targetLabel: target.displayName,
      status: "SUCCESS",
      details: result
    });

    const completed = await prisma.mutation.update({
      where: { id: mutation.id },
      data: {
        status: "SUCCESS",
        externalActivityId: result.externalActivityId,
        result: result.message,
        auditId: audit.id,
        completedAt: new Date()
      }
    });

    return { device: updatedDevice, mutation: completed, auditId: audit.id };
  } catch (error) {
    const audit = await auditEvent({
      action: "MDM_ASSIGNMENT",
      serial: normalized,
      actor,
      targetKey: target.key,
      targetLabel: target.displayName,
      status: "FAILED",
      details: error instanceof Error ? error.message : "Onbekende fout"
    });
    await prisma.mutation.update({
      where: { id: mutation.id },
      data: {
        status: "FAILED",
        result: error instanceof Error ? error.message : "Onbekende fout",
        auditId: audit.id,
        completedAt: new Date()
      }
    });
    throw error;
  }
}

export async function assignJamfPrestage(serial: string, prestageKey: string, actor: CurrentUser) {
  await ensureReferenceData();
  const normalized = cleanSerial(serial);
  if (!JAMF_PRESTAGE_KEYS.has(prestageKey)) {
    throw new AppError("Onbekende PreStage Enrollment", 400, "UNKNOWN_PRESTAGE");
  }

  const device = await getDevice(normalized);
  if (device.currentMdmServerKey !== "JAMF_WERKPLEKKEN") {
    throw new AppError("PreStage kan alleen worden gekozen voor Jamf Werkplekken devices", 409, "DEVICE_NOT_ON_JAMF_MDM");
  }

  const target = await prisma.jamfPrestageMap.findUnique({ where: { key: prestageKey } });
  if (!target || !target.active) {
    throw new AppError("PreStage is niet beschikbaar", 400, "PRESTAGE_NOT_AVAILABLE");
  }

  const mutation = await prisma.mutation.create({
    data: {
      type: "JAMF_PRESTAGE",
      serial: normalized,
      status: "RUNNING",
      requestedByEmail: actor.email,
      requestedByName: actor.name,
      targetKey: target.key,
      targetLabel: target.displayName
    }
  });

  try {
    await integrations().jamf.getComputerStatus(normalized);
    const result = await integrations().jamf.assignPrestage(normalized, target);
    const updatedDevice = await prisma.deviceCache.update({
      where: { serial: normalized },
      data: {
        jamfStatus: "IN_SCOPE",
        currentPrestageKey: target.key,
        currentPrestageName: target.displayName,
        lastSyncedAt: new Date()
      }
    });
    const audit = await auditEvent({
      action: "JAMF_PRESTAGE",
      serial: normalized,
      actor,
      targetKey: target.key,
      targetLabel: target.displayName,
      status: "SUCCESS",
      details: result
    });
    const completed = await prisma.mutation.update({
      where: { id: mutation.id },
      data: {
        status: "SUCCESS",
        externalActivityId: result.externalActivityId,
        result: result.message,
        auditId: audit.id,
        completedAt: new Date()
      }
    });

    return { device: updatedDevice, mutation: completed, auditId: audit.id };
  } catch (error) {
    const audit = await auditEvent({
      action: "JAMF_PRESTAGE",
      serial: normalized,
      actor,
      targetKey: target.key,
      targetLabel: target.displayName,
      status: "FAILED",
      details: error instanceof Error ? error.message : "Onbekende fout"
    });
    await prisma.mutation.update({
      where: { id: mutation.id },
      data: {
        status: "FAILED",
        result: error instanceof Error ? error.message : "Onbekende fout",
        auditId: audit.id,
        completedAt: new Date()
      }
    });
    throw error;
  }
}

export async function integrationHealth() {
  await ensureReferenceData();
  const { abm, jamf, serviceNow } = integrations();
  const results: IntegrationHealthStatus[] = await Promise.all([abm.health(), jamf.health(), serviceNow.health()]);
  const ping: IntegrationHealthStatus = {
    name: "Ping SAML",
    status: "OK",
    message: "SAML routes actief; mock login toegestaan in lokale configuratie"
  };
  const all = [...results, ping];

  await Promise.all(
    all.map((health) =>
      prisma.integrationHealth.upsert({
        where: { name: health.name },
        create: {
          name: health.name,
          status: health.status,
          message: health.message,
          lastCheckedAt: new Date()
        },
        update: {
          status: health.status,
          message: health.message,
          lastCheckedAt: new Date()
        }
      })
    )
  );

  return prisma.integrationHealth.findMany({ orderBy: { name: "asc" } });
}

export async function latestMutations() {
  return prisma.mutation.findMany({
    orderBy: { createdAt: "desc" },
    take: 30
  });
}

export async function latestAuditEvents() {
  return prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

export function displayTarget(kind: "mdm" | "prestage", key: string) {
  return kind === "mdm" ? mdmLabel(key) : prestageLabel(key);
}
