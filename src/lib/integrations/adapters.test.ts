import { describe, expect, it } from "vitest";
import { MockAbmClient } from "@/lib/integrations/abm";
import { MockJamfClient } from "@/lib/integrations/jamf";
import { ServiceNowPlaceholderClient } from "@/lib/integrations/servicenow";

describe("integration adapters", () => {
  it("returns searchable mock ABM devices", async () => {
    const client = new MockAbmClient();
    const devices = await client.syncDevices();
    const selected = await client.getDevice("c02zq0abcmd6");

    expect(devices.length).toBeGreaterThan(0);
    expect(selected?.currentMdmServerKey).toBe("JAMF_WERKPLEKKEN");
  });

  it("assigns a mock Jamf PreStage", async () => {
    const client = new MockJamfClient();
    const result = await client.assignPrestage("C02ZQ0ABCMD6", {
      key: "BASIS",
      displayName: "Basis",
      jamfId: "mock-prestage-basis",
      versionLock: 0
    });

    expect(result.message).toContain("Basis");
    expect(result.externalActivityId).toContain("mock-jamf");
  });

  it("keeps ServiceNow reserved in v1", async () => {
    const health = await new ServiceNowPlaceholderClient().health();
    expect(health.name).toBe("ServiceNow");
    expect(health.status).toBe("DEGRADED");
  });
});
