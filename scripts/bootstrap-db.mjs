import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const migrationName = "20260701220000_init";

const statements = [
  `CREATE TABLE IF NOT EXISTS "DeviceCache" (
    "serial" TEXT NOT NULL PRIMARY KEY,
    "model" TEXT,
    "abmStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "currentMdmServerKey" TEXT,
    "currentMdmServerName" TEXT,
    "assignedServerId" TEXT,
    "jamfStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "currentPrestageKey" TEXT,
    "currentPrestageName" TEXT,
    "lastSyncedAt" DATETIME,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "MdmServerMap" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "appleServerId" TEXT,
    "isAssignable" BOOLEAN NOT NULL DEFAULT true,
    "isJamf" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "JamfPrestageMap" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "jamfId" TEXT,
    "versionLock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Mutation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedByEmail" TEXT NOT NULL,
    "requestedByName" TEXT,
    "targetKey" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "externalActivityId" TEXT,
    "result" TEXT,
    "auditId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "serial" TEXT,
    "actorEmail" TEXT NOT NULL,
    "actorName" TEXT,
    "groupNames" TEXT,
    "targetKey" TEXT,
    "targetLabel" TEXT,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "IntegrationHealth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "groups" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "AuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relayState" TEXT NOT NULL,
    "returnTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationHealth_name_key" ON "IntegrationHealth"("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AuthState_relayState_key" ON "AuthState"("relayState")`,
  `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`
];

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  const checksum = createHash("sha256").update(statements.join(";\n")).digest("hex");
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, NULL, NULL, CURRENT_TIMESTAMP, ?)`,
    migrationName,
    checksum,
    migrationName,
    statements.length
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database bootstrap complete");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
