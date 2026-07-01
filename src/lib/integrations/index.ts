import { createAbmClient } from "@/lib/integrations/abm";
import { createJamfClient } from "@/lib/integrations/jamf";
import { createServiceNowClient } from "@/lib/integrations/servicenow";

export function integrations() {
  return {
    abm: createAbmClient(),
    jamf: createJamfClient(),
    serviceNow: createServiceNowClient()
  };
}
