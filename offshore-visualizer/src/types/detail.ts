export interface MemberItem {
  name: string;
  kind: 'Method' | 'Property' | 'Field' | 'Event';
  returnType?: string;
  signature?: string;
  isPublic?: boolean;
}

export interface TypeDetailItem {
  id: number;
  name: string;
  fullName: string;
  kind: 'Class' | 'Interface' | 'Struct' | 'Enum';
  namespace: string;
  baseType?: string;
  interfaces?: string[];
  members?: MemberItem[];
}

export interface DllDetailPayload {
  id: number;
  name: string;
  version?: string;
  architecture?: 'x86' | 'x64' | 'MSIL' | 'Native' | 'MSIL / .NET' | 'Vendor / Runtime' | string;
  isNative?: boolean;
  totalTypes: number;
  dependencies: Array<{
    id: number;
    name: string;
  }>;
  types: TypeDetailItem[];
}