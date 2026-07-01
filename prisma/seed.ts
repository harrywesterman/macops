import { prisma } from "../src/lib/db";
import { MOCK_DEVICES } from "../src/lib/integrations/mock-data";
import { ensureReferenceData } from "../src/lib/services/reference-data";

async function main() {
  await ensureReferenceData();

  await Promise.all(
    MOCK_DEVICES.map((device) =>
      prisma.deviceCache.upsert({
        where: { serial: device.serial },
        create: {
          serial: device.serial,
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
      })
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
