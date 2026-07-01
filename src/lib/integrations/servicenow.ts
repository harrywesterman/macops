import { env, isLiveMode } from "@/lib/env";
import type { IntegrationHealthStatus, ServiceNowClient } from "@/lib/integrations/types";

export class ServiceNowPlaceholderClient implements ServiceNowClient {
  async health(): Promise<IntegrationHealthStatus> {
    if (!isLiveMode()) {
      return { name: "ServiceNow", status: "DEGRADED", message: "Adapter gereserveerd; niet actief in v1" };
    }

    if (!env.serviceNow.baseUrl || !env.serviceNow.clientId || !env.serviceNow.clientSecret) {
      return { name: "ServiceNow", status: "NOT_CONFIGURED", message: "ServiceNow credentials ontbreken" };
    }

    return { name: "ServiceNow", status: "DEGRADED", message: "Table API adapter is gepland voor een volgende release" };
  }
}

export function createServiceNowClient(): ServiceNowClient {
  return new ServiceNowPlaceholderClient();
}
