import type { DeviceRecord } from "@/lib/integrations/types";

export const MOCK_DEVICES: DeviceRecord[] = [
  {
    serial: "C02ZQ0ABCMD6",
    model: "MacBook Pro 14-inch M3",
    abmStatus: "ASSIGNED",
    currentMdmServerKey: "JAMF_WERKPLEKKEN",
    currentMdmServerName: "Jamf Werkplekken",
    assignedServerId: "mock-mdm-jamf-werkplekken",
    jamfStatus: "IN_SCOPE",
    currentPrestageKey: "BASIS",
    currentPrestageName: "Basis"
  },
  {
    serial: "FVFG90LMQ6L4",
    model: "MacBook Air 13-inch M2",
    abmStatus: "ASSIGNED",
    currentMdmServerKey: "UEM",
    currentMdmServerName: "UEM",
    assignedServerId: "mock-mdm-uem",
    jamfStatus: "NOT_ON_JAMF"
  },
  {
    serial: "H9YV21N7Q2PN",
    model: "MacBook Pro 16-inch M2 Max",
    abmStatus: "AVAILABLE",
    jamfStatus: "UNKNOWN"
  },
  {
    serial: "J31383K6Q05D",
    model: "MacBook Air 15-inch M3",
    abmStatus: "ASSIGNED",
    currentMdmServerKey: "UEM_SBT",
    currentMdmServerName: "UEM SBT",
    assignedServerId: "mock-mdm-uem-sbt",
    jamfStatus: "NOT_ON_JAMF"
  },
  {
    serial: "KX4P8X90RT2L",
    model: "MacBook Pro 13-inch M1",
    abmStatus: "ASSIGNED",
    currentMdmServerKey: "JAMF_WERKPLEKKEN",
    currentMdmServerName: "Jamf Werkplekken",
    assignedServerId: "mock-mdm-jamf-werkplekken",
    jamfStatus: "IN_SCOPE",
    currentPrestageKey: "BASIS_COMMUNICATIE",
    currentPrestageName: "Basis Communicatie"
  }
];
