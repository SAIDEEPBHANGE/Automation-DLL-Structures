export interface MasterGraphPayload {
  version: number;
  generatedAt: string;
  stats: {
    dllCount: number;
    typeNodeCount: number;
    dllRefCount: number;
    typeRefCount: number;
  };
  dlls: Array<{
    id: number;
    name: string;
    version?: string;
    detailFile: string;
    fw?: string | null; // Target framework, e.g. "net48" (optional)
  }>;
  nodes: Array<{
    i: number;      // Type Id
    n: string;      // Type Name
    fn: string;     // Full Name
    d: number;      // Dll Id
    k: string;      // Kind ("Class" | "Interface" | "Struct")
  }>;
  dllEdges: Array<{
    s: number;      // Source DllId
    t: number;      // Target DllId
  }>;
  typeEdges: Array<{
    s: number;      // Source TypeId
    t: number;      // Target TypeId
    sd: number;     // Source DllId
    td: number;     // Target DllId
    k: string;      // Reference Kind
  }>;
}