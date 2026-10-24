import type { FrameworkFamily } from "../utils/frameworkUtils";

/* Raw DLL detail JSON (PascalCase, as written by the backend scanner) */
export interface RawAttribute {
  Name: string;
  Arguments?: Record<string, unknown> | null;
}

export interface RawParameter {
  Name: string;
  Type: string;
  IsOptional?: boolean;
  DefaultValue?: unknown;
  IsOut?: boolean;
  IsRef?: boolean;
  Attributes?: RawAttribute[] | null;
}

export interface RawField {
  Name: string;
  Type: string;
  IsPublic?: boolean;
  IsStatic?: boolean;
  IsReadonly?: boolean;
  Attributes?: RawAttribute[] | null;
}

export interface RawProperty {
  Name: string;
  Type: string;
  CanRead?: boolean;
  CanWrite?: boolean;
  Attributes?: RawAttribute[] | null;
}

export interface RawMethod {
  Name: string;
  ReturnType: string;
  IsStatic?: boolean;
  IsPublic?: boolean;
  IsVirtual?: boolean;
  IsAbstract?: boolean;
  IsConstructor?: boolean;
  Parameters?: RawParameter[];
  Attributes?: RawAttribute[] | null;
}

export interface RawEvent {
  Name: string;
  Type?: string;
  EventType?: string;
  Attributes?: RawAttribute[] | null;
}

export interface RawType {
  Id?: number;
  Name: string;
  Namespace?: string;
  FullName: string;
  DeclaringType?: string | null;
  BaseType?: string | null;
  IsAbstract?: boolean;
  IsSealed?: boolean;
  ImplementedInterfaces?: string[];
  Fields?: RawField[];
  Properties?: RawProperty[];
  Methods?: RawMethod[];
  Events?: RawEvent[];
  Values?: string[];
  ReturnType?: string;
  Parameters?: RawParameter[];
  Attributes?: RawAttribute[] | null;
}

export interface RawDllDetail {
  Id: number;
  DllName: string;
  Version?: string;
  FilePath?: string;
  Metadata?: {
    AssemblyName?: string;
    Culture?: string | null;
    PublicKeyToken?: string | null;
    RuntimeVersion?: string;
    ScanDate?: string;
  };
  Dependencies?: Array<{
    AssemblyName: string;
    Version?: string;
    IsLocalDll?: boolean;
    ReferencedJsonFile?: string | null;
  }>;
  Classes?: RawType[];
  Interfaces?: RawType[];
  Structs?: RawType[];
  Enums?: RawType[];
  Delegates?: RawType[];
}

/* View models used by the UI */
export type MemberKind = "Method" | "Property" | "Field" | "Event";

export interface AttributeItem {
  /** Short name without namespace or the "Attribute" suffix, e.g. "Obsolete". */
  name: string;
  args: Array<{ key: string; value: string }>;
}

export interface MemberParam {
  type: string;
  name: string;
  modifier?: "out" | "ref";
  optional: boolean;
  defaultValue?: string;
  attributes: AttributeItem[];
}

export interface MemberItem {
  name: string;
  kind: MemberKind;
  /** Single-line text form, used for search/copy. */
  signature: string;
  returnType?: string;
  params: MemberParam[];
  accessors?: string;
  flags: string[];
  attributes: AttributeItem[];
  isObsolete: boolean;
}

export type TypeKind = "Class" | "Interface" | "Struct" | "Enum" | "Delegate";

export interface TypeDetailItem {
  key: string;
  id?: number;
  name: string;
  fullName: string;
  declaringType?: string;
  kind: TypeKind;
  namespace: string;
  baseType?: string;
  interfaces: string[];
  flags: string[];
  members: MemberItem[];
  enumValues: string[];
  signature?: string;
  delegateParams: MemberParam[];
  attributes: AttributeItem[];
  isObsolete: boolean;
}

export interface ConnectedDll {
  id: number;
  name: string;
}

export interface ExternalReference {
  name: string;
  version?: string;
  isLocal: boolean;
  referencedJsonFile?: string;
  /** Present when the reference resolves to a DLL in the master graph. */
  graphId?: number;
}

export interface TypeLink {
  direction: "out" | "in";
  kind: string;
  /** Type on this DLL and the type on the other side. */
  localType: string;
  otherType: string;
  otherDllId: number;
  otherDllName: string;
}

export interface DllDetailPayload {
  id: number;
  name: string;
  assemblyName?: string;
  framework: FrameworkFamily;
  typeLinks: TypeLink[];
  version?: string;
  architecture: string;
  filePath?: string;
  runtimeVersion?: string;
  culture?: string;
  publicKeyToken?: string;
  scanDate?: string;
  /** Assemblies this DLL consumes (outbound edges). */
  dependencies: ConnectedDll[];
  /** Assemblies that consume this DLL (inbound edges). */
  dependents: ConnectedDll[];
  references: ExternalReference[];
  types: TypeDetailItem[];
  typeCounts: Record<TypeKind, number>;
  obsoleteCount: number;
}
