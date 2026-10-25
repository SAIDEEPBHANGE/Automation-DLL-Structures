import type { RawAttribute, RawDllDetail, TypeKind } from "./detail";
import type { Suite } from "../utils/graphUtils";

export type SearchScope =
  | "DLL"
  | "Reference"
  | TypeKind
  | "Method"
  | "Parameter"
  | "Property"
  | "Field"
  | "Event"
  | "Attribute";

export type SearchCategory = "name" | "description" | "other";

export interface SearchRow {
  id: number;
  scope: SearchScope;
  text: string;
  field: string;
  category: SearchCategory;
  dllId: number;
  dllName: string;
  origin: "msil" | "vendor";
  typeName?: string;
  typeFullName?: string;
  typeKind?: TypeKind;
  memberName?: string;
  memberSignature?: string;
}

export interface SearchFilters {
  scopes: SearchScope[];
  typeKind: TypeKind | "all";
  origin: "all" | "msil" | "vendor";
  category: "all" | "name" | "description";
  dllId: number | null;
}

export interface SearchResult {
  queryId: number;
  rows: SearchRow[];
  total: number;
  dllCount: number;
  scopeCounts: Record<SearchScope, number>;
  offset: number;
}

export interface SearchProgress {
  suite: Suite;
  indexed: number;
  total: number;
  failed: number;
  lastError?: string;
  complete: boolean;
}

export type SearchWorkerRequest =
  | {
      type: "index";
      suite: Suite;
      generatedAt: string;
      dlls: Array<{ id: number; name: string; detailFile?: string }>;
    }
  | {
      type: "query";
      suite: Suite;
      queryId: number;
      text: string;
      filters: SearchFilters;
      offset: number;
    };

export type SearchWorkerResponse =
  | { type: "progress"; progress: SearchProgress }
  | { type: "results"; result: SearchResult; partial: boolean }
  | { type: "error"; suite: Suite; message: string };

export interface SearchDocument {
  row: SearchRow;
  normalized: string;
}

export type SearchableDll = RawDllDetail;

export type SearchAttribute = RawAttribute;
