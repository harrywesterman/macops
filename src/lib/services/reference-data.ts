import { JAMF_PRESTAGES, MDM_SERVERS } from "@/lib/constants";
import { prisma } from "@/lib/db";

export async function ensureReferenceData() {
  await Promise.all([
    ...MDM_SERVERS.map((server) =>
      prisma.mdmServerMap.upsert({
        where: { key: server.key },
        create: {
          key: server.key,
          displayName: server.displayName,
          isJamf: server.isJamf,
          appleServerId: `mock-mdm-${server.key.toLowerCase().replaceAll("_", "-")}`
        },
        update: {
          displayName: server.displayName,
          isJamf: server.isJamf
        }
      })
    ),
    ...JAMF_PRESTAGES.map((prestage) =>
      prisma.jamfPrestageMap.upsert({
        where: { key: prestage.key },
        create: {
          key: prestage.key,
          displayName: prestage.displayName,
          jamfId: `mock-prestage-${prestage.key.toLowerCase()}`,
          versionLock: 0,
          active: true
        },
        update: {
          displayName: prestage.displayName,
          active: true
        }
      })
    )
  ]);
}
