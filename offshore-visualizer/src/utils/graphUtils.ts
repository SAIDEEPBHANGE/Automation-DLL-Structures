import type { MasterGraphPayload } from "../types/graph";
import type { ConnectedDll } from "../types/detail";

export type Suite = "SmartPlant3D" | "SmartPlantPID";

export const SUITES: Array<{ id: Suite; label: string }> = [
  { id: "SmartPlant3D", label: "SmartPlant 3D" },
  { id: "SmartPlantPID", label: "SmartPlant P&ID" },
];

export interface SearchOption {
  id: string;
  label: string;
}

export function buildAdjacency(
  data: MasterGraphPayload,
): Map<number, Set<number>> {
  const adjacency = new Map<number, Set<number>>();
  data.dlls.forEach((d) => adjacency.set(d.id, new Set()));
  data.dllEdges.forEach((e) => {
    adjacency.get(e.s)?.add(e.t);
    adjacency.get(e.t)?.add(e.s);
  });
  return adjacency;
}

export function getConnectedDlls(
  data: MasterGraphPayload,
  id: number,
): { outbound: ConnectedDll[]; inbound: ConnectedDll[] } {
  const names = new Map(data.dlls.map((d) => [d.id, d.name]));
  const toItem = (n: number): ConnectedDll => ({
    id: n,
    name: names.get(n) ?? `DLL #${n}`,
  });
  const outbound: ConnectedDll[] = [];
  const inbound: ConnectedDll[] = [];
  data.dllEdges.forEach((e) => {
    if (e.s === id) outbound.push(toItem(e.t));
    else if (e.t === id) inbound.push(toItem(e.s));
  });
  return { outbound, inbound };
}

export function buildSearchOptions(
  data: MasterGraphPayload | null,
): SearchOption[] {
  if (!data) return [];
  return data.dlls.map((d) => ({
    id: String(d.id),
    label: `${d.name} (#${d.id})`,
  }));
}

export function getGraphStats(data: MasterGraphPayload | null) {
  if (!data) return undefined;
  return {
    nodesCount: data.dlls.length,
    edgesCount: data.dllEdges.length,
    typeNodeCount: data.stats?.typeNodeCount ?? data.nodes.length,
    dllRefCount: data.stats?.dllRefCount ?? data.dllEdges.length,
    typeRefCount: data.stats?.typeRefCount ?? data.typeEdges.length,
    generatedAt: data.generatedAt,
  };
}

export function resolveDetailUrl(
  suite: Suite,
  dll: { id: number; name: string; detailFile?: string },
): string {
  let path = dll.detailFile || `${dll.id}_${dll.name}.json`;
  if (!path.startsWith("Dlls/") && !path.startsWith("/")) path = `Dlls/${path}`;
  return `/data/${suite}/${path}`;
}
