import { AppError } from "@/lib/http";
import { env, isLiveMode } from "@/lib/env";
import type { AssignmentResult, DeviceRecord, IntegrationHealthStatus, JamfClient, JamfPrestageTarget } from "@/lib/integrations/types";

export class MockJamfClient implements JamfClient {
  async getComputerStatus(): Promise<Pick<DeviceRecord, "jamfStatus" | "currentPrestageKey" | "currentPrestageName">> {
    return { jamfStatus: "IN_SCOPE" };
  }

  async assignPrestage(serial: string, target: JamfPrestageTarget): Promise<AssignmentResult> {
    return {
      externalActivityId: `mock-jamf-${serial}-${Date.now()}`,
      message: `Serienummer ${serial} is toegevoegd aan ${target.displayName}.`
    };
  }

  async health(): Promise<IntegrationHealthStatus> {
    return { name: "Jamf Pro", status: "OK", message: "Mock Jamf actief" };
  }
}

export class JamfProClient implements JamfClient {
  private token?: { value: string; expiresAt: number };

  private assertConfigured() {
    if (!env.jamf.baseUrl || !env.jamf.clientId || !env.jamf.clientSecret) {
      throw new AppError("Jamf Pro is niet volledig geconfigureerd", 503, "JAMF_NOT_CONFIGURED");
    }
  }

  private baseUrl() {
    this.assertConfigured();
    return env.jamf.baseUrl!.replace(/\/$/, "");
  }

  private async accessToken() {
    this.assertConfigured();
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.value;
    }

    const response = await fetch(`${this.baseUrl()}/api/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env.jamf.clientId!,
        client_secret: env.jamf.clientSecret!
      })
    });

    if (!response.ok) {
      throw new AppError(`Jamf token aanvraag mislukt (${response.status})`, 502, "JAMF_TOKEN_FAILED");
    }

    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) {
      throw new AppError("Jamf token response bevat geen access_token", 502, "JAMF_TOKEN_INVALID");
    }

    this.token = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 1200) * 1000
    };
    return this.token.value;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.accessToken();
    const response = await fetch(`${this.baseUrl()}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...init?.headers
      }
    });

    if (!response.ok) {
      throw new AppError(`Jamf API fout (${response.status})`, 502, "JAMF_API_FAILED");
    }

    return (await response.json()) as T;
  }

  async getComputerStatus(serial: string): Promise<Pick<DeviceRecord, "jamfStatus" | "currentPrestageKey" | "currentPrestageName">> {
    try {
      await this.request(`/api/v1/computers-inventory?section=GENERAL&filter=hardware.serialNumber=="${encodeURIComponent(serial)}"`);
      return { jamfStatus: "IN_SCOPE" };
    } catch {
      return { jamfStatus: "NOT_FOUND" };
    }
  }

  async assignPrestage(serial: string, target: JamfPrestageTarget): Promise<AssignmentResult> {
    if (!target.jamfId) {
      throw new AppError(`Geen Jamf PreStage-id geconfigureerd voor ${target.displayName}`, 400, "JAMF_PRESTAGE_MAPPING_MISSING");
    }

    const existing = await this.request<{ serialNumbers?: string[]; assignments?: string[] }>(
      `/api/v2/computer-prestages/${encodeURIComponent(target.jamfId)}/scope`
    );
    const serialNumbers = new Set([...(existing.serialNumbers ?? existing.assignments ?? []), serial]);

    await this.request(`/api/v2/computer-prestages/${encodeURIComponent(target.jamfId)}/scope`, {
      method: "PUT",
      body: JSON.stringify({
        serialNumbers: [...serialNumbers],
        versionLock: target.versionLock
      })
    });

    return {
      externalActivityId: `jamf-prestage-${target.jamfId}`,
      message: `Jamf PreStage ${target.displayName} is bijgewerkt.`
    };
  }

  async health(): Promise<IntegrationHealthStatus> {
    try {
      await this.accessToken();
      return { name: "Jamf Pro", status: "OK", message: "Jamf OAuth token beschikbaar" };
    } catch (error) {
      if (error instanceof AppError && error.code === "JAMF_NOT_CONFIGURED") {
        return { name: "Jamf Pro", status: "NOT_CONFIGURED", message: error.message };
      }
      return { name: "Jamf Pro", status: "ERROR", message: error instanceof Error ? error.message : "Onbekende fout" };
    }
  }
}

export function createJamfClient(): JamfClient {
  return isLiveMode() ? new JamfProClient() : new MockJamfClient();
}
