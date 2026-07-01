export const MDM_SERVERS = [
  { key: "UEM", displayName: "UEM", isJamf: false },
  { key: "JAMF_WERKPLEKKEN", displayName: "Jamf Werkplekken", isJamf: true },
  { key: "UEM_SBT", displayName: "UEM SBT", isJamf: false }
] as const;

export const JAMF_PRESTAGES = [
  { key: "ONTWIKKEL", displayName: "Ontwikkel" },
  { key: "BASIS", displayName: "Basis" },
  { key: "BASIS_COMMUNICATIE", displayName: "Basis Communicatie" },
  { key: "BASIS_INFORMATIEBEHEER", displayName: "Basis InformatieBeheer" }
] as const;

export const INTEGRATIONS = ["ABM", "Jamf Pro", "Ping SAML", "ServiceNow"] as const;

export type MdmServerKey = (typeof MDM_SERVERS)[number]["key"];
export type JamfPrestageKey = (typeof JAMF_PRESTAGES)[number]["key"];

export const MDM_SERVER_KEYS = new Set<string>(MDM_SERVERS.map((server) => server.key));
export const JAMF_PRESTAGE_KEYS = new Set<string>(JAMF_PRESTAGES.map((prestage) => prestage.key));

export function mdmLabel(key: string) {
  return MDM_SERVERS.find((server) => server.key === key)?.displayName ?? key;
}

export function prestageLabel(key: string) {
  return JAMF_PRESTAGES.find((prestage) => prestage.key === key)?.displayName ?? key;
}
