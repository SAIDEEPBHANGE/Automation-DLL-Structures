/* Raw DLL detail JSON (PascalCase, as written by the backend scanner) */
export interface RawParameter {
  Name: string;
  Type: string;
  IsOptional?: boolean;
  IsOut?: boolean;
  IsRef?: boolean;
}

export interface RawField {
  Name: string;
  Type: string;
  IsPublic?: boolean;
  IsStatic?: boolean;
  IsReadonly?: boolean;
}

export interface RawProperty {
  Name: string;
  Type: string;
  CanRead?: boolean;
  CanWrite?: boolean;
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
}

export interface RawEvent {
  Name: string;
  Type?: string;
  EventType?: string;
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
}

export interface RawDllDetail {
  Id: number;
  DllName: string;
  Version?: string;
  FilePath?: string;
  Metadata?: {
    AssemblyName?: string;
    RuntimeVersion?: string;
    ScanDate?: string;
  };
  Dependencies?: Array<{
    AssemblyName: string;
    Version?: string;
    IsLocalDll?: boolean;
  }>;
  Classes?: RawType[];
  Interfaces?: RawType[];
  Structs?: RawType[];
  Enums?: RawType[];
  Delegates?: RawType[];
}

/* View models used by the UI */
export type MemberKind = "Method" | "Property" | "Field" | "Event";

export interface MemberItem {
  name: string;
  kind: MemberKind;
  signature: string;
  flags: string[];
}

export type TypeKind = "Class" | "Interface" | "Struct" | "Enum" | "Delegate";

export interface TypeDetailItem {
  key: string;
  name: string;
  fullName: string;
  kind: TypeKind;
  namespace: string;
  baseType?: string;
  interfaces: string[];
  flags: string[];
  members: MemberItem[];
  enumValues: string[];
  signature?: string;
}

export interface ConnectedDll {
  id: number;
  name: string;
}

export interface ExternalReference {
  name: string;
  version?: string;
  isLocal: boolean;
  /** Present when the reference resolves to a DLL in the master graph. */
  graphId?: number;
}

export interface DllDetailPayload {
  id: number;
  name: string;
  version?: string;
  architecture: string;
  filePath?: string;
  runtimeVersion?: string;
  scanDate?: string;
  /** Assemblies this DLL consumes (outbound edges). */
  dependencies: ConnectedDll[];
  /** Assemblies that consume this DLL (inbound edges). */
  dependents: ConnectedDll[];
  references: ExternalReference[];
  types: TypeDetailItem[];
  typeCounts: Record<TypeKind, number>;
}
