import type { JamfPrestageKey, MdmServerKey } from "@/lib/constants";

export type DeviceRecord = {
  serial: string;
  model?: string | null;
  abmStatus: string;
  currentMdmServerKey?: MdmServerKey | string | null;
  currentMdmServerName?: string | null;
  assignedServerId?: string | null;
  jamfStatus: string;
  currentPrestageKey?: JamfPrestageKey | string | null;
  currentPrestageName?: string | null;
  rawJson?: string | null;
};

export type IntegrationHealthStatus = {
  name: string;
  status: "OK" | "DEGRADED" | "NOT_CONFIGURED" | "ERROR";
  message?: string;
};

export type MdmServerTarget = {
  key: string;
  displayName: string;
  appleServerId?: string | null;
  isJamf: boolean;
};

export type JamfPrestageTarget = {
  key: string;
  displayName: string;
  jamfId?: string | null;
  versionLock: number;
};

export type AssignmentResult = {
  externalActivityId?: string;
  message: string;
};

export interface AbmClient {
  syncDevices(): Promise<DeviceRecord[]>;
  getDevice(serial: string): Promise<DeviceRecord | undefined>;
  assignMdmServer(serial: string, target: MdmServerTarget): Promise<AssignmentResult>;
  health(): Promise<IntegrationHealthStatus>;
}

export interface JamfClient {
  getComputerStatus(serial: string): Promise<Pick<DeviceRecord, "jamfStatus" | "currentPrestageKey" | "currentPrestageName">>;
  assignPrestage(serial: string, target: JamfPrestageTarget): Promise<AssignmentResult>;
  health(): Promise<IntegrationHealthStatus>;
}

export interface ServiceNowClient {
  health(): Promise<IntegrationHealthStatus>;
}
