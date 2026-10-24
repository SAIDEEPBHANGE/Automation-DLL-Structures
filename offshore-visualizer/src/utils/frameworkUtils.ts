import type { MasterGraphPayload } from "../types/graph";

export type FrameworkFamily = "netfx" | "netcore" | "netstandard" | "unknown";

export const FRAMEWORK_ORDER: FrameworkFamily[] = ["netfx", "netcore", "netstandard", "unknown"];

export const FRAMEWORK_LABEL: Record<FrameworkFamily, string> = {
  netfx: ".NET Framework",
  netcore: ".NET / .NET Core",
  netstandard: ".NET Standard",
  unknown: "Unknown",
};

export const FRAMEWORK_HEX: Record<FrameworkFamily, number> = {
  netfx: 0x3b82f6,
  netcore: 0x22c55e,
  netstandard: 0xa855f7,
  unknown: 0x64748b,
};

export const frameworkCss = (f: FrameworkFamily): string => `#${FRAMEWORK_HEX[f].toString(16).padStart(6, "0")}`;

/** Accepts ".NET Framework 4.8", "net48", "net6.0", "netstandard2.0", "v4.0.30319", ... */
export function normalizeFramework(raw: string | null | undefined): FrameworkFamily {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "unknown";
  if (s.includes("standard")) return "netstandard";
  if (s.includes("framework") || /^net\d{2,3}$/.test(s) || /^v[234]\.\d/.test(s)) return "netfx";
  if (s.includes("core") || /^net\d+\.\d/.test(s) || /^\.net\s*\d/.test(s)) return "netcore";
  return "unknown";
}

/** Per-DLL `fw` wins; otherwise the suite-level fallback (e.g. audit TargetFramework). */
export function getDllFramework(dll: { fw?: string | null }, suiteFallback?: string | null): FrameworkFamily {
  const own = normalizeFramework(dll.fw);
  return own !== "unknown" ? own : normalizeFramework(suiteFallback);
}

export function countFrameworks(
  data: MasterGraphPayload | null,
  suiteFallback?: string | null,
): Record<FrameworkFamily, number> {
  const counts: Record<FrameworkFamily, number> = { netfx: 0, netcore: 0, netstandard: 0, unknown: 0 };
  data?.dlls.forEach((d) => (counts[getDllFramework(d, suiteFallback)] += 1));
  return counts;
}
