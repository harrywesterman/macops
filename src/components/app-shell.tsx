"use client";

import {
  Activity,
  ClipboardList,
  DatabaseZap,
  Laptop,
  LogOut,
  RefreshCcw,
  Search,
  ServerCog,
  ShieldCheck
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { JAMF_PRESTAGES, MDM_SERVERS } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";

export type SerializableDevice = {
  serial: string;
  model?: string | null;
  abmStatus: string;
  currentMdmServerKey?: string | null;
  currentMdmServerName?: string | null;
  jamfStatus: string;
  currentPrestageKey?: string | null;
  currentPrestageName?: string | null;
  lastSyncedAt?: string | null;
};

export type SerializableMutation = {
  id: string;
  type: string;
  serial: string;
  status: string;
  requestedByEmail: string;
  targetLabel: string;
  result?: string | null;
  auditId?: string | null;
  createdAt: string;
};

export type SerializableAudit = {
  id: string;
  action: string;
  serial?: string | null;
  actorEmail: string;
  targetLabel?: string | null;
  status: string;
  createdAt: string;
};

export type SerializableIntegration = {
  id: string;
  name: string;
  status: string;
  message?: string | null;
  lastCheckedAt: string;
};

type User = {
  email: string;
  name?: string | null;
  groups: string[];
};

type ApiResult<T> = T & { error?: string; code?: string };

function shortDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers
    }
  });
  const json = (await response.json()) as ApiResult<T>;
  if (!response.ok) {
    throw new Error(json.error ?? `HTTP ${response.status}`);
  }
  return json as T;
}

export function AppShell({
  user,
  initialDevices,
  initialMutations,
  initialAudit,
  initialIntegrations
}: {
  user: User;
  initialDevices: SerializableDevice[];
  initialMutations: SerializableMutation[];
  initialAudit: SerializableAudit[];
  initialIntegrations: SerializableIntegration[];
}) {
  const [activeView, setActiveView] = useState<"devices" | "mutations" | "audit" | "integrations">("devices");
  const [query, setQuery] = useState("");
  const [devices, setDevices] = useState(initialDevices);
  const [mutations, setMutations] = useState(initialMutations);
  const [audit, setAudit] = useState(initialAudit);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [selectedSerial, setSelectedSerial] = useState(initialDevices[0]?.serial);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const selectedDevice = useMemo(
    () => devices.find((device) => device.serial === selectedSerial) ?? devices[0],
    [devices, selectedSerial]
  );

  const refreshDevices = useCallback((nextQuery = query) => {
    startTransition(async () => {
      setError(undefined);
      try {
        const data = await requestJson<{ devices: SerializableDevice[] }>(`/api/devices?query=${encodeURIComponent(nextQuery)}`);
        setDevices(data.devices);
        setSelectedSerial((current) => (data.devices.some((device) => device.serial === current) ? current : data.devices[0]?.serial));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Zoeken mislukt");
      }
    });
  }, [query]);

  const refreshAuxiliary = useCallback(() => {
    startTransition(async () => {
      const [mutationData, auditData, healthData] = await Promise.all([
        requestJson<{ mutations: SerializableMutation[] }>("/api/mutations"),
        requestJson<{ audit: SerializableAudit[] }>("/api/audit"),
        requestJson<{ integrations: SerializableIntegration[] }>("/api/integrations/health")
      ]);
      setMutations(mutationData.mutations);
      setAudit(auditData.audit);
      setIntegrations(healthData.integrations);
    });
  }, []);

  function runSync() {
    startTransition(async () => {
      setError(undefined);
      setNotice(undefined);
      try {
        const data = await requestJson<{ count: number }>("/api/sync/abm", { method: "POST", body: "{}" });
        setNotice(`${data.count} ABM devices gesynchroniseerd`);
        refreshDevices(query);
        refreshAuxiliary();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Synchronisatie mislukt");
      }
    });
  }

  function assignMdm(mdmServerKey: string) {
    if (!selectedDevice) {
      return;
    }
    startTransition(async () => {
      setError(undefined);
      setNotice(undefined);
      try {
        const data = await requestJson<{ device: SerializableDevice; auditId: string }>(
          `/api/devices/${encodeURIComponent(selectedDevice.serial)}/mdm-assignment`,
          { method: "POST", body: JSON.stringify({ mdmServerKey }) }
        );
        setDevices((current) => current.map((device) => (device.serial === data.device.serial ? data.device : device)));
        setSelectedSerial(data.device.serial);
        setNotice(`MDM bijgewerkt · audit ${data.auditId}`);
        refreshAuxiliary();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "MDM wijziging mislukt");
        refreshAuxiliary();
      }
    });
  }

  function assignPrestage(prestageKey: string) {
    if (!selectedDevice) {
      return;
    }
    startTransition(async () => {
      setError(undefined);
      setNotice(undefined);
      try {
        const data = await requestJson<{ device: SerializableDevice; auditId: string }>(
          `/api/devices/${encodeURIComponent(selectedDevice.serial)}/jamf-prestage`,
          { method: "POST", body: JSON.stringify({ prestageKey }) }
        );
        setDevices((current) => current.map((device) => (device.serial === data.device.serial ? data.device : device)));
        setNotice(`PreStage bijgewerkt · audit ${data.auditId}`);
        refreshAuxiliary();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "PreStage wijziging mislukt");
        refreshAuxiliary();
      }
    });
  }

  const navItems = [
    { key: "devices", label: "Devices", icon: Laptop },
    { key: "mutations", label: "Mutaties", icon: Activity },
    { key: "audit", label: "Audit", icon: ClipboardList },
    { key: "integrations", label: "Integraties", icon: ServerCog }
  ] as const;

  const okCount = integrations.filter((item) => item.status === "OK").length;

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#f8f4ed] text-[#172124]">
            <ShieldCheck size={22} aria-hidden />
          </div>
          <div className="min-w-[130px]">
            <div className="text-xl font-bold">MacOps</div>
            <div className="text-xs text-[#c9d3d0]">{user.name ?? user.email}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-2 lg:flex-col max-lg:flex-row">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`segmented-button justify-start border-[#2b393d] bg-transparent text-[#f8f4ed] ${
                  activeView === item.key ? "bg-[#f8f4ed] text-[#172124]" : ""
                }`}
                onClick={() => setActiveView(item.key)}
                type="button"
              >
                <Icon size={17} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
        <a className="segmented-button mt-auto justify-start border-[#2b393d] bg-transparent text-[#f8f4ed]" href="/auth/logout">
          <LogOut size={17} aria-hidden />
          Uitloggen
        </a>
      </aside>

      <main className="main-plane">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Werkplekbeheer</h1>
            <p className="text-sm text-[var(--ink-muted)]">{devices.length} devices · {okCount}/{integrations.length} integraties OK</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-button" onClick={refreshAuxiliary} title="Vernieuwen" type="button">
              <RefreshCcw size={17} aria-hidden />
            </button>
            <button className="text-button primary" disabled={pending} onClick={runSync} type="button">
              <DatabaseZap size={17} aria-hidden />
              Sync ABM
            </button>
          </div>
        </header>

        {(notice || error) && (
          <div className={`mb-4 panel px-4 py-3 text-sm ${error ? "text-[var(--red)]" : "text-[var(--green)]"}`}>
            {error ?? notice}
          </div>
        )}

        {activeView === "devices" && (
          <section className="work-grid">
            <div className="panel min-w-0">
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] p-4">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" size={17} />
                  <input
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 outline-none focus:border-[var(--pine)]"
                    placeholder="Serienummer"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        refreshDevices(event.currentTarget.value);
                      }
                    }}
                  />
                </div>
                <button className="text-button" disabled={pending} onClick={() => refreshDevices(query)} type="button">
                  <Search size={17} aria-hidden />
                  Zoeken
                </button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Serienummer</th>
                      <th>Model</th>
                      <th>ABM</th>
                      <th>MDM</th>
                      <th>Jamf</th>
                      <th>PreStage</th>
                      <th>Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr
                        key={device.serial}
                        aria-selected={selectedDevice?.serial === device.serial}
                        onClick={() => setSelectedSerial(device.serial)}
                      >
                        <td className="whitespace-nowrap font-mono font-semibold">{device.serial}</td>
                        <td>{device.model ?? "-"}</td>
                        <td><StatusBadge value={device.abmStatus} /></td>
                        <td>{device.currentMdmServerName ?? "-"}</td>
                        <td><StatusBadge value={device.jamfStatus} /></td>
                        <td>{device.currentPrestageName ?? "-"}</td>
                        <td>{shortDate(device.lastSyncedAt)}</td>
                      </tr>
                    ))}
                    {devices.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-[var(--ink-muted)]">
                          Geen resultaten
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="panel inspector p-4">
              {selectedDevice ? (
                <>
                  <div className="border-b border-[var(--line)] pb-4">
                    <div className="text-xs font-bold uppercase text-[var(--ink-muted)]">Geselecteerd</div>
                    <h2 className="mt-1 font-mono text-2xl font-bold">{selectedDevice.serial}</h2>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">{selectedDevice.model ?? "Onbekend model"}</p>
                  </div>

                  <div className="grid gap-3 border-b border-[var(--line)] py-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">ABM</span>
                      <StatusBadge value={selectedDevice.abmStatus} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">MDM</span>
                      <strong>{selectedDevice.currentMdmServerName ?? "-"}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--ink-muted)]">PreStage</span>
                      <strong>{selectedDevice.currentPrestageName ?? "-"}</strong>
                    </div>
                  </div>

                  <div className="py-4">
                    <h3 className="text-sm font-bold">MDM koppelen</h3>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {MDM_SERVERS.map((server) => (
                        <button
                          key={server.key}
                          className={`text-button justify-between ${selectedDevice.currentMdmServerKey === server.key ? "primary" : ""}`}
                          disabled={pending || selectedDevice.currentMdmServerKey === server.key}
                          onClick={() => assignMdm(server.key)}
                          type="button"
                        >
                          <span>{server.displayName}</span>
                          <span>{selectedDevice.currentMdmServerKey === server.key ? "Actief" : "Kies"}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedDevice.currentMdmServerKey === "JAMF_WERKPLEKKEN" && (
                    <div className="border-t border-[var(--line)] pt-4">
                      <h3 className="text-sm font-bold">Jamf PreStage</h3>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {JAMF_PRESTAGES.map((prestage) => (
                          <button
                            key={prestage.key}
                            className={`text-button justify-between ${selectedDevice.currentPrestageKey === prestage.key ? "primary" : ""}`}
                            disabled={pending || selectedDevice.currentPrestageKey === prestage.key}
                            onClick={() => assignPrestage(prestage.key)}
                            type="button"
                          >
                            <span>{prestage.displayName}</span>
                            <span>{selectedDevice.currentPrestageKey === prestage.key ? "Actief" : "Kies"}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-[var(--ink-muted)]">Geen device geselecteerd</div>
              )}
            </aside>
          </section>
        )}

        {activeView === "mutations" && (
          <TablePanel
            headers={["Tijd", "Type", "Serienummer", "Doel", "Status", "Audit"]}
            rows={mutations.map((item) => [
              shortDate(item.createdAt),
              item.type.replaceAll("_", " "),
              item.serial,
              item.targetLabel,
              <StatusBadge key={item.id} value={item.status} />,
              item.auditId ?? "-"
            ])}
          />
        )}

        {activeView === "audit" && (
          <TablePanel
            headers={["Tijd", "Actie", "Serienummer", "Gebruiker", "Doel", "Status"]}
            rows={audit.map((item) => [
              shortDate(item.createdAt),
              item.action.replaceAll("_", " "),
              item.serial ?? "-",
              item.actorEmail,
              item.targetLabel ?? "-",
              <StatusBadge key={item.id} value={item.status} />
            ])}
          />
        )}

        {activeView === "integrations" && (
          <TablePanel
            headers={["Naam", "Status", "Bericht", "Laatste check"]}
            rows={integrations.map((item) => [
              item.name,
              <StatusBadge key={item.id} value={item.status} />,
              item.message ?? "-",
              shortDate(item.lastCheckedAt)
            ])}
          />
        )}
      </main>
    </div>
  );
}

function TablePanel({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <section className="panel table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="text-[var(--ink-muted)]">
                Geen records
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
