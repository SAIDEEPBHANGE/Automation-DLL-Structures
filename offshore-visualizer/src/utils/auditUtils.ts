import type {
  AuditDllRow,
  AuditPayload,
  AuditSortKey,
  AuditSummary,
} from "../types/audit";

export const AUDIT_BASE_URL = "/data/Backend-Audits/data";
export const AUDIT_INDEX_URL = `${AUDIT_BASE_URL}/api/latest-audit.json`;

export type StatusColor = "success" | "error" | "warning" | "info" | "default";

export function flattenAuditDlls(audit: AuditPayload): AuditDllRow[] {
  const rows: AuditDllRow[] = [];
  audit.Folders.forEach((f) => {
    f.Dlls.forEach((d) => rows.push({ ...d, folder: f.FolderName, isNative: false }));
    (f.NativeDlls ?? []).forEach((d) => rows.push({ ...d, folder: f.FolderName, isNative: true }));
  });
  return rows;
}

export interface AuditFilters {
  status: string;
  folder: string;
  text: string;
}

export function filterAuditRows(rows: AuditDllRow[], f: AuditFilters): AuditDllRow[] {
  const q = f.text.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (f.status === "all" || r.Status === f.status) &&
      (f.folder === "all" || r.folder === f.folder) &&
      (q === "" || r.DllName.toLowerCase().includes(q) || (r.Reason ?? "").toLowerCase().includes(q)),
  );
}

export function sortAuditRows(rows: AuditDllRow[], key: AuditSortKey, dir: "asc" | "desc"): AuditDllRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * sign;
    return String(av).localeCompare(String(bv)) * sign;
  });
}

export function getSlowestDlls(rows: AuditDllRow[], n: number): AuditDllRow[] {
  return [...rows].sort((a, b) => (b.DurationMs ?? 0) - (a.DurationMs ?? 0)).slice(0, n);
}

export function formatDuration(ms?: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function statusColor(status: string): StatusColor {
  switch (status) {
    case "Processed":
      return "success";
    case "Failed":
      return "error";
    case "PartiallyProcessed":
      return "warning";
    case "Native":
      return "info";
    default:
      return "default";
  }
}

export interface StatusSlice {
  label: string;
  value: number;
  color: StatusColor;
}

export function buildStatusDistribution(s: AuditSummary): StatusSlice[] {
  return [
    { label: "Processed", value: s.Processed, color: "success" },
    { label: "Partial", value: s.PartiallyProcessed, color: "warning" },
    { label: "Failed", value: s.Failed, color: "error" },
    { label: "Skipped", value: s.Skipped, color: "default" },
    { label: "Native", value: s.NativeFound, color: "info" },
  ];
}
