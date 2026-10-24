import type {
  ConnectedDll,
  DllDetailPayload,
  MemberItem,
  MemberParam,
  RawDllDetail,
  RawParameter,
  RawType,
  TypeDetailItem,
  TypeKind,
} from "../types/detail";
import type { MasterGraphPayload } from "../types/graph";
import { getArchitectureLabel } from "./dllClassifier";
import { getConnectedDlls } from "./graphUtils";

/** Strips namespaces and generic arity: System.Collections.Generic.List`1 -> List */
export function shortType(t: string | undefined | null): string {
  if (!t) return "";
  return t.replace(/`\d+/g, "").replace(/\b(?:\w+\.)+(\w+)/g, "$1");
}

function mapParams(params: RawParameter[] | undefined): MemberParam[] {
  return (params ?? []).map((p) => ({
    type: shortType(p.Type),
    name: p.Name,
    modifier: p.IsOut ? "out" : p.IsRef ? "ref" : undefined,
    optional: !!p.IsOptional,
  }));
}

function formatParams(params: RawParameter[] | undefined): string {
  return mapParams(params)
    .map((p) => `${p.modifier ? `${p.modifier} ` : ""}${p.type} ${p.name}${p.optional ? "?" : ""}`)
    .join(", ");
}

function mapMembers(raw: RawType): MemberItem[] {
  const members: MemberItem[] = [];

  (raw.Fields ?? []).forEach((f) => {
    const flags = [f.IsPublic ? "public" : "private"];
    if (f.IsStatic) flags.push("static");
    if (f.IsReadonly) flags.push("readonly");
    members.push({
      name: f.Name,
      kind: "Field",
      signature: `${shortType(f.Type)} ${f.Name}`,
      returnType: shortType(f.Type),
      params: [],
      flags,
    });
  });

  (raw.Properties ?? []).forEach((p) => {
    const acc = [p.CanRead ? "get" : "", p.CanWrite ? "set" : ""].filter(Boolean).join("; ");
    members.push({
      name: p.Name,
      kind: "Property",
      signature: `${shortType(p.Type)} ${p.Name} { ${acc}; }`,
      returnType: shortType(p.Type),
      params: [],
      accessors: acc ? `{ ${acc}; }` : undefined,
      flags: [],
    });
  });

  (raw.Methods ?? []).forEach((m) => {
    const flags = [m.IsPublic ? "public" : "non-public"];
    if (m.IsStatic) flags.push("static");
    if (m.IsAbstract) flags.push("abstract");
    else if (m.IsVirtual) flags.push("virtual");
    if (m.IsConstructor) flags.push("constructor");
    const ret = m.IsConstructor ? "" : `${shortType(m.ReturnType)} `;
    members.push({
      name: m.IsConstructor ? raw.Name : m.Name,
      kind: "Method",
      signature: `${ret}${m.Name}(${formatParams(m.Parameters)})`,
      returnType: m.IsConstructor ? undefined : shortType(m.ReturnType),
      params: mapParams(m.Parameters),
      flags,
    });
  });

  (raw.Events ?? []).forEach((e) => {
    members.push({
      name: e.Name,
      kind: "Event",
      signature: `${shortType(e.Type ?? e.EventType)} ${e.Name}`.trim(),
      returnType: shortType(e.Type ?? e.EventType) || undefined,
      params: [],
      flags: [],
    });
  });

  return members;
}

function mapType(raw: RawType, kind: TypeKind): TypeDetailItem {
  const flags: string[] = [];
  if (raw.IsAbstract) flags.push("abstract");
  if (raw.IsSealed) flags.push("sealed");
  return {
    key: `${kind}:${raw.FullName}`,
    name: raw.Name,
    fullName: raw.FullName,
    kind,
    namespace: raw.Namespace ?? "",
    baseType: raw.BaseType ? shortType(raw.BaseType) : undefined,
    interfaces: (raw.ImplementedInterfaces ?? []).map(shortType),
    flags,
    members: mapMembers(raw),
    enumValues: raw.Values ?? [],
    signature:
      kind === "Delegate"
        ? `${shortType(raw.ReturnType)} ${raw.Name}(${formatParams(raw.Parameters)})`
        : undefined,
  };
}

const EMPTY_COUNTS: Record<TypeKind, number> = { Class: 0, Interface: 0, Struct: 0, Enum: 0, Delegate: 0 };

/** Immediate view model from the master graph (before the detail chunk arrives). */
export function buildInitialDetail(
  data: MasterGraphPayload,
  dll: { id: number; name: string; version?: string },
): DllDetailPayload {
  const { outbound, inbound } = getConnectedDlls(data, dll.id);
  return {
    id: dll.id,
    name: dll.name,
    version: dll.version,
    architecture: getArchitectureLabel(dll.name),
    dependencies: outbound,
    dependents: inbound,
    references: [],
    types: [],
    typeCounts: { ...EMPTY_COUNTS },
  };
}

export function mapDllDetail(
  raw: RawDllDetail,
  base: DllDetailPayload,
  data: MasterGraphPayload,
): DllDetailPayload {
  const idByName = new Map<string, number>(data.dlls.map((d) => [d.name.toLowerCase(), d.id]));
  const references = (raw.Dependencies ?? []).map((d) => ({
    name: d.AssemblyName,
    version: d.Version,
    isLocal: !!d.IsLocalDll,
    graphId: idByName.get(d.AssemblyName.toLowerCase()),
  }));

  const types: TypeDetailItem[] = [
    ...(raw.Classes ?? []).map((t) => mapType(t, "Class")),
    ...(raw.Interfaces ?? []).map((t) => mapType(t, "Interface")),
    ...(raw.Structs ?? []).map((t) => mapType(t, "Struct")),
    ...(raw.Enums ?? []).map((t) => mapType(t, "Enum")),
    ...(raw.Delegates ?? []).map((t) => mapType(t, "Delegate")),
  ];

  const typeCounts = { ...EMPTY_COUNTS };
  types.forEach((t) => (typeCounts[t.kind] += 1));

  const dependencies: ConnectedDll[] = base.dependencies;

  return {
    ...base,
    version: raw.Version || base.version,
    filePath: raw.FilePath,
    runtimeVersion: raw.Metadata?.RuntimeVersion,
    scanDate: raw.Metadata?.ScanDate,
    dependencies,
    references,
    types,
    typeCounts,
  };
}
