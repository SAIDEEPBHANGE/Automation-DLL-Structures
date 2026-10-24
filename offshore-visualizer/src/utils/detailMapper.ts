import type {
  AttributeItem,
  ConnectedDll,
  DllDetailPayload,
  MemberItem,
  MemberParam,
  RawAttribute,
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

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return `"${v}"`;
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/** System.ObsoleteAttribute -> Obsolete */
export function mapAttributes(raw: RawAttribute[] | null | undefined): AttributeItem[] {
  return (raw ?? []).map((a) => ({
    name: shortType(a.Name).replace(/Attribute$/, "") || a.Name,
    args: Object.entries(a.Arguments ?? {}).map(([key, value]) => ({ key, value: stringifyValue(value) })),
  }));
}

export function hasObsolete(attrs: AttributeItem[]): boolean {
  return attrs.some((a) => a.name === "Obsolete");
}

function mapParams(params: RawParameter[] | undefined): MemberParam[] {
  return (params ?? []).map((p) => ({
    type: shortType(p.Type),
    name: p.Name,
    modifier: p.IsOut ? "out" : p.IsRef ? "ref" : undefined,
    optional: !!p.IsOptional,
    attributes: mapAttributes(p.Attributes),
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
    const attributes = mapAttributes(f.Attributes);
    members.push({
      name: f.Name,
      kind: "Field",
      signature: `${shortType(f.Type)} ${f.Name}`,
      returnType: shortType(f.Type),
      params: [],
      flags,
      attributes,
      isObsolete: hasObsolete(attributes),
    });
  });

  (raw.Properties ?? []).forEach((p) => {
    const acc = [p.CanRead ? "get" : "", p.CanWrite ? "set" : ""].filter(Boolean).join("; ");
    const attributes = mapAttributes(p.Attributes);
    members.push({
      name: p.Name,
      kind: "Property",
      signature: `${shortType(p.Type)} ${p.Name} { ${acc}; }`,
      returnType: shortType(p.Type),
      params: [],
      accessors: acc ? `{ ${acc}; }` : undefined,
      flags: [],
      attributes,
      isObsolete: hasObsolete(attributes),
    });
  });

  (raw.Methods ?? []).forEach((m) => {
    const flags = [m.IsPublic ? "public" : "non-public"];
    if (m.IsStatic) flags.push("static");
    if (m.IsAbstract) flags.push("abstract");
    else if (m.IsVirtual) flags.push("virtual");
    if (m.IsConstructor) flags.push("constructor");
    const ret = m.IsConstructor ? "" : `${shortType(m.ReturnType)} `;
    const attributes = mapAttributes(m.Attributes);
    members.push({
      name: m.IsConstructor ? raw.Name : m.Name,
      kind: "Method",
      signature: `${ret}${m.Name}(${formatParams(m.Parameters)})`,
      returnType: m.IsConstructor ? undefined : shortType(m.ReturnType),
      params: mapParams(m.Parameters),
      flags,
      attributes,
      isObsolete: hasObsolete(attributes),
    });
  });

  (raw.Events ?? []).forEach((e) => {
    const attributes = mapAttributes(e.Attributes);
    members.push({
      name: e.Name,
      kind: "Event",
      signature: `${shortType(e.Type ?? e.EventType)} ${e.Name}`.trim(),
      returnType: shortType(e.Type ?? e.EventType) || undefined,
      params: [],
      flags: [],
      attributes,
      isObsolete: hasObsolete(attributes),
    });
  });

  return members;
}

function mapType(raw: RawType, kind: TypeKind): TypeDetailItem {
  const flags: string[] = [];
  if (raw.IsAbstract) flags.push("abstract");
  if (raw.IsSealed) flags.push("sealed");
  const attributes = mapAttributes(raw.Attributes);
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
    delegateParams: kind === "Delegate" ? mapParams(raw.Parameters) : [],
    attributes,
    isObsolete: hasObsolete(attributes),
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
    obsoleteCount: 0,
  };
}

/** "1_Interop.SPFW.json" -> 1 (detail files are prefixed with the DLL id). */
function idFromDetailFile(file: string | null | undefined): number | undefined {
  const m = /(?:^|[\\/])(\d+)_[^\\/]*$/.exec(file ?? "");
  return m ? parseInt(m[1], 10) : undefined;
}

export function mapDllDetail(
  raw: RawDllDetail,
  base: DllDetailPayload,
  data: MasterGraphPayload,
): DllDetailPayload {
  const idByName = new Map<string, number>(data.dlls.map((d) => [d.name.toLowerCase(), d.id]));
  const knownIds = new Set(data.dlls.map((d) => d.id));
  const references = (raw.Dependencies ?? []).map((d) => {
    const fromFile = idFromDetailFile(d.ReferencedJsonFile);
    return {
      name: d.AssemblyName,
      version: d.Version,
      isLocal: !!d.IsLocalDll,
      referencedJsonFile: d.ReferencedJsonFile ?? undefined,
      graphId: idByName.get(d.AssemblyName.toLowerCase()) ?? (fromFile && knownIds.has(fromFile) ? fromFile : undefined),
    };
  });

  const types: TypeDetailItem[] = [
    ...(raw.Classes ?? []).map((t) => mapType(t, "Class")),
    ...(raw.Interfaces ?? []).map((t) => mapType(t, "Interface")),
    ...(raw.Structs ?? []).map((t) => mapType(t, "Struct")),
    ...(raw.Enums ?? []).map((t) => mapType(t, "Enum")),
    ...(raw.Delegates ?? []).map((t) => mapType(t, "Delegate")),
  ];

  const typeCounts = { ...EMPTY_COUNTS };
  types.forEach((t) => (typeCounts[t.kind] += 1));
  const obsoleteCount = types.filter((t) => t.isObsolete || t.members.some((m) => m.isObsolete)).length;

  const dependencies: ConnectedDll[] = base.dependencies;

  return {
    ...base,
    version: raw.Version || base.version,
    filePath: raw.FilePath,
    runtimeVersion: raw.Metadata?.RuntimeVersion,
    culture: raw.Metadata?.Culture ?? undefined,
    publicKeyToken: raw.Metadata?.PublicKeyToken ?? undefined,
    scanDate: raw.Metadata?.ScanDate,
    dependencies,
    references,
    types,
    typeCounts,
    obsoleteCount,
  };
}
