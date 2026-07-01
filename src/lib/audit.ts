import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export async function auditEvent(input: {
  action: string;
  serial?: string;
  actor: CurrentUser;
  targetKey?: string;
  targetLabel?: string;
  status: string;
  details?: unknown;
}) {
  return prisma.auditEvent.create({
    data: {
      action: input.action,
      serial: input.serial,
      actorEmail: input.actor.email,
      actorName: input.actor.name,
      groupNames: input.actor.groups.join(","),
      targetKey: input.targetKey,
      targetLabel: input.targetLabel,
      status: input.status,
      details: input.details === undefined ? undefined : JSON.stringify(input.details)
    }
  });
}
