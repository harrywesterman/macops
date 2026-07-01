CREATE TABLE "DeviceCache" (
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
);

CREATE TABLE "MdmServerMap" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "appleServerId" TEXT,
    "isAssignable" BOOLEAN NOT NULL DEFAULT true,
    "isJamf" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "JamfPrestageMap" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "jamfId" TEXT,
    "versionLock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Mutation" (
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
);

CREATE TABLE "AuditEvent" (
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
);

CREATE TABLE "IntegrationHealth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "groups" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "AuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "relayState" TEXT NOT NULL,
    "returnTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "IntegrationHealth_name_key" ON "IntegrationHealth"("name");
CREATE UNIQUE INDEX "AuthState_relayState_key" ON "AuthState"("relayState");
