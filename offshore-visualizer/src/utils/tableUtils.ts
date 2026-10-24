import type { MasterGraphPayload } from "../types/graph";
import { getArchitectureLabel, isVendorDll } from "./dllClassifier";

export interface GraphTableRow {
  id: number;
  name: string;
  version: string;
  architecture: string;
  isVendor: boolean;
  outbound: number;
  inbound: number;
  typeCount: number;
}

export type TableSortKey = "id" | "name" | "version" | "outbound" | "inbound" | "typeCount";
export type VendorFilter = "all" | "vendor" | "own";

export function buildTableRows(data: MasterGraphPayload | null): GraphTableRow[] {
  if (!data) return [];
  const outbound = new Map<number, number>();
  const inbound = new Map<number, number>();
  data.dllEdges.forEach((e) => {
    outbound.set(e.s, (outbound.get(e.s) ?? 0) + 1);
    inbound.set(e.t, (inbound.get(e.t) ?? 0) + 1);
  });
  const types = new Map<number, number>();
  data.nodes.forEach((n) => types.set(n.d, (types.get(n.d) ?? 0) + 1));

  return data.dlls.map((d) => ({
    id: d.id,
    name: d.name,
    version: d.version ?? "-",
    architecture: getArchitectureLabel(d.name),
    isVendor: isVendorDll(d.name),
    outbound: outbound.get(d.id) ?? 0,
    inbound: inbound.get(d.id) ?? 0,
    typeCount: types.get(d.id) ?? 0,
  }));
}

export function filterTableRows(rows: GraphTableRow[], text: string, vendor: VendorFilter): GraphTableRow[] {
  const q = text.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (vendor === "all" || (vendor === "vendor") === r.isVendor) &&
      (q === "" || r.name.toLowerCase().includes(q) || String(r.id).includes(q)),
  );
}

export function sortTableRows(rows: GraphTableRow[], key: TableSortKey, dir: "asc" | "desc"): GraphTableRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * sign;
  });
}
