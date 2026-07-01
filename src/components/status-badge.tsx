"use client";

export function StatusBadge({ value }: { value?: string | null }) {
  const text = value ?? "UNKNOWN";
  const normalized = text.toUpperCase();
  const tone =
    normalized.includes("OK") ||
    normalized.includes("SUCCESS") ||
    normalized.includes("ASSIGNED") ||
    normalized.includes("IN_SCOPE")
      ? "ok"
      : normalized.includes("ERROR") || normalized.includes("FAILED") || normalized.includes("NOT_FOUND")
        ? "error"
        : normalized.includes("DEGRADED") || normalized.includes("NOT_CONFIGURED") || normalized.includes("RUNNING")
          ? "warn"
          : "";

  return <span className={`badge ${tone}`}>{text.replaceAll("_", " ")}</span>;
}
