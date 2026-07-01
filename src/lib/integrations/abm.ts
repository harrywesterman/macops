import { SignJWT, importPKCS8 } from "jose";
import { AppError } from "@/lib/http";
import { env, isLiveMode } from "@/lib/env";
import { MOCK_DEVICES } from "@/lib/integrations/mock-data";
import type { AbmClient, DeviceRecord, IntegrationHealthStatus, MdmServerTarget } from "@/lib/integrations/types";

function normalizeDevice(input: unknown): DeviceRecord | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const record = input as Record<string, unknown>;
  const attributes = (record.attributes ?? record) as Record<string, unknown>;
  const serial = String(attributes.serialNumber ?? attributes.serial ?? "");
  if (!serial) {
    return undefined;
  }

  const mdmName = attributes.assignedServerName ?? attributes.currentMdmServerName;
  return {
    serial,
    model: typeof attributes.model === "string" ? attributes.model : undefined,
    abmStatus: String(attributes.status ?? "UNKNOWN"),
    currentMdmServerName: typeof mdmName === "string" ? mdmName : undefined,
    assignedServerId: typeof attributes.assignedServerId === "string" ? attributes.assignedServerId : undefined,
    jamfStatus: "UNKNOWN",
    rawJson: JSON.stringify(input)
  };
}

export class MockAbmClient implements AbmClient {
  async syncDevices() {
    return MOCK_DEVICES;
  }

  async getDevice(serial: string) {
    return MOCK_DEVICES.find((device) => device.serial.toUpperCase() === serial.toUpperCase());
  }

  async assignMdmServer(serial: string, target: MdmServerTarget) {
    return {
      externalActivityId: `mock-abm-${serial}-${Date.now()}`,
      message: `Serienummer ${serial} is gekoppeld aan ${target.displayName}.`
    };
  }

  async health(): Promise<IntegrationHealthStatus> {
    return { name: "ABM", status: "OK", message: "Mock ABM actief" };
  }
}

export class AppleBusinessManagerClient implements AbmClient {
  private token?: { value: string; expiresAt: number };

  private assertConfigured() {
    if (!env.abm.clientId || !env.abm.keyId || !env.abm.privateKey) {
      throw new AppError("ABM is niet volledig geconfigureerd", 503, "ABM_NOT_CONFIGURED");
    }
  }

  private async accessToken() {
    this.assertConfigured();
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.value;
    }

    const key = await importPKCS8(env.abm.privateKey!, "ES256");
    const assertion = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: env.abm.keyId })
      .setIssuer(env.abm.clientId!)
      .setSubject(env.abm.clientId!)
      .setAudience(env.abm.tokenUrl)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.abm.clientId!,
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
      scope: env.abm.scope
    });

    const response = await fetch(env.abm.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      throw new AppError(`ABM token aanvraag mislukt (${response.status})`, 502, "ABM_TOKEN_FAILED");
    }

    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) {
      throw new AppError("ABM token response bevat geen access_token", 502, "ABM_TOKEN_INVALID");
    }

    this.token = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 300) * 1000
    };
    return this.token.value;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.accessToken();
    const response = await fetch(`${env.abm.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...init?.headers
      }
    });

    if (!response.ok) {
      throw new AppError(`ABM API fout (${response.status})`, 502, "ABM_API_FAILED");
    }

    return (await response.json()) as T;
  }

  async syncDevices() {
    const json = await this.request<{ data?: unknown[] }>("/v1/orgDevices");
    return (json.data ?? []).flatMap((item) => {
      const device = normalizeDevice(item);
      return device ? [device] : [];
    });
  }

  async getDevice(serial: string) {
    const json = await this.request<{ data?: unknown[] }>(`/v1/orgDevices?filter[serialNumber]=${encodeURIComponent(serial)}`);
    const devices = (json.data ?? []).flatMap((item) => {
      const device = normalizeDevice(item);
      return device ? [device] : [];
    });
    return devices[0];
  }

  async assignMdmServer(serial: string, target: MdmServerTarget) {
    if (!target.appleServerId) {
      throw new AppError(`Geen ABM server-id geconfigureerd voor ${target.displayName}`, 400, "ABM_MDM_MAPPING_MISSING");
    }

    const json = await this.request<{ data?: { id?: string } }>("/v1/orgDeviceActivities", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "orgDeviceActivities",
          attributes: {
            activityType: "ASSIGN_DEVICES",
            serialNumbers: [serial]
          },
          relationships: {
            mdmServer: {
              data: { type: "mdmServers", id: target.appleServerId }
            }
          }
        }
      })
    });

    return {
      externalActivityId: json.data?.id,
      message: `ABM assignment naar ${target.displayName} is aangemaakt.`
    };
  }

  async health(): Promise<IntegrationHealthStatus> {
    try {
      await this.accessToken();
      return { name: "ABM", status: "OK", message: "ABM token beschikbaar" };
    } catch (error) {
      if (error instanceof AppError && error.code === "ABM_NOT_CONFIGURED") {
        return { name: "ABM", status: "NOT_CONFIGURED", message: error.message };
      }
      return { name: "ABM", status: "ERROR", message: error instanceof Error ? error.message : "Onbekende fout" };
    }
  }
}

export function createAbmClient(): AbmClient {
  return isLiveMode() ? new AppleBusinessManagerClient() : new MockAbmClient();
}
