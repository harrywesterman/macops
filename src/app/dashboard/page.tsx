import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/session";
import { integrationHealth, latestAuditEvents, latestMutations, searchDevices } from "@/lib/services/devices";
import { AppShell } from "@/components/app-shell";
import type { SerializableAudit, SerializableDevice, SerializableIntegration, SerializableMutation } from "@/components/app-shell";

export const dynamic = "force-dynamic";

function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function DashboardPage() {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/auth/login?returnTo=/dashboard");
  }

  const [devices, mutations, audit, integrations] = await Promise.all([
    searchDevices(),
    latestMutations(),
    latestAuditEvents(),
    integrationHealth()
  ]);

  return (
    <AppShell
      user={user}
      initialDevices={serialize<SerializableDevice[]>(devices)}
      initialMutations={serialize<SerializableMutation[]>(mutations)}
      initialAudit={serialize<SerializableAudit[]>(audit)}
      initialIntegrations={serialize<SerializableIntegration[]>(integrations)}
    />
  );
}
