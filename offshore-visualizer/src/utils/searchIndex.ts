import type {
  RawAttribute,
  RawDllDetail,
  RawEvent,
  RawField,
  RawMethod,
  RawParameter,
  RawProperty,
  RawType,
  TypeKind,
} from "../types/detail";
import type {
  SearchCategory,
  SearchDocument,
  SearchFilters,
  SearchResult,
  SearchRow,
  SearchScope,
} from "../types/search";
import { getOrigin } from "./dllClassifier";

export const SEARCH_SCOPES: SearchScope[] = [
  "DLL",
  "Reference",
  "Class",
  "Interface",
  "Struct",
  "Enum",
  "Delegate",
  "Method",
  "Parameter",
  "Property",
  "Field",
  "Event",
  "Attribute",
];

export const SEARCH_PAGE_SIZE = 500;

export interface SearchIndex {
  documents: SearchDocument[];
  trigrams: Map<string, number[]>;
}

const TYPE_LISTS: Array<{ key: keyof RawDllDetail; kind: TypeKind }> = [
  { key: "Classes", kind: "Class" },
  { key: "Interfaces", kind: "Interface" },
  { key: "Structs", kind: "Struct" },
  { key: "Enums", kind: "Enum" },
  { key: "Delegates", kind: "Delegate" },
];

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return String(value ?? "");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isDescriptionAttribute(attribute: RawAttribute): boolean {
  return /(?:^|\.)DescriptionAttribute$/i.test(attribute.Name);
}

function addAttributeRows(
  add: (scope: SearchScope, text: string | null | undefined, field: string, category?: SearchCategory) => void,
  attributes: RawAttribute[] | null | undefined,
) {
  for (const attribute of attributes ?? []) {
    add("Attribute", attribute.Name, "Attribute", "name");
    const description = isDescriptionAttribute(attribute);
    for (const [key, value] of Object.entries(attribute.Arguments ?? {})) {
      add("Attribute", key, "Attribute argument key");
      add("Attribute", formatValue(value), description ? "Description" : "Attribute argument value", description ? "description" : "other");
    }
  }
}

function methodSignature(method: RawMethod, typeName: string): string {
  const name = method.IsConstructor ? typeName : method.Name;
  const returnType = method.IsConstructor ? "" : `${method.ReturnType} `;
  const params = (method.Parameters ?? []).map((parameter) => `${parameter.Type} ${parameter.Name}`).join(", ");
  return `${returnType}${name}(${params})`;
}

function memberRows(
  add: (scope: SearchScope, text: string | null | undefined, field: string, category?: SearchCategory, extra?: Partial<SearchRow>) => void,
  type: RawType,
) {
  const addMemberAttributes = (
    attributes: RawAttribute[] | null | undefined,
    memberName: string,
    signature: string,
  ) => {
    const memberAdd = (
      scope: SearchScope,
      text: string | null | undefined,
      field: string,
      category?: SearchCategory,
    ) => add(scope, text, field, category, { memberName, memberSignature: signature });
    addAttributeRows(memberAdd, attributes);
  };

  const addParameter = (
    parameter: RawParameter,
    memberName: string,
    signature: string,
  ) => {
    const extra = { memberName, memberSignature: signature };
    add("Parameter", parameter.Name, "Name", "name", extra);
    add("Parameter", parameter.Type, "Type", "other", extra);
    add("Parameter", formatValue(parameter.DefaultValue), "Default value", "other", extra);
    addAttributeRows(
      (scope, text, field, category) => add(scope, text, field, category, extra),
      parameter.Attributes,
    );
  };

  const addMember = (
    scope: "Method" | "Property" | "Field" | "Event",
    member: RawMethod | RawProperty | RawField | RawEvent,
    name: string,
    signature: string,
    typeText?: string,
  ) => {
    const extra = { memberName: name, memberSignature: signature };
    add(scope, name, "Name", "name", extra);
    if (typeText) add(scope, typeText, scope === "Method" ? "Return type" : "Type", "other", extra);
    if ("Attributes" in member) addMemberAttributes(member.Attributes, name, signature);
    if (scope === "Method") {
      for (const parameter of (member as RawMethod).Parameters ?? []) {
        addParameter(parameter, name, signature);
      }
    }
  };

  for (const field of type.Fields ?? []) {
    addMember("Field", field, field.Name, `${field.Type} ${field.Name}`, field.Type);
  }
  for (const property of type.Properties ?? []) {
    addMember("Property", property, property.Name, `${property.Type} ${property.Name}`, property.Type);
  }
  for (const method of type.Methods ?? []) {
    addMember(
      "Method",
      method,
      method.IsConstructor ? type.Name : method.Name,
      methodSignature(method, type.Name),
      method.IsConstructor ? undefined : method.ReturnType,
    );
  }
  for (const event of type.Events ?? []) {
    const eventType = event.Type ?? event.EventType;
    addMember("Event", event, event.Name, `${eventType ?? ""} ${event.Name}`.trim(), eventType);
  }
}

export function flattenDll(raw: RawDllDetail, origin = getOrigin(raw.DllName)): SearchRow[] {
  const rows: SearchRow[] = [];
  const add = (
    scope: SearchScope,
    text: string | null | undefined,
    field: string,
    category: SearchCategory = "other",
    extra: Partial<SearchRow> = {},
  ) => {
    if (!text) return;
    rows.push({
      id: rows.length,
      scope,
      text,
      field,
      category,
      dllId: raw.Id,
      dllName: raw.DllName,
      origin,
      ...extra,
    });
  };

  add("DLL", raw.DllName, "DLL name", "name");
  add("DLL", raw.Metadata?.AssemblyName, "Assembly name", "name");
  add("DLL", raw.FilePath, "File path");
  add("DLL", raw.Version, "Version");
  for (const dependency of raw.Dependencies ?? []) {
    add("Reference", dependency.AssemblyName, "Assembly name", "name");
    add("Reference", dependency.Version, "Version");
  }

  for (const { key, kind } of TYPE_LISTS) {
    for (const type of (raw[key] as RawType[] | undefined) ?? []) {
      const typeInfo = {
        typeName: type.Name,
        typeFullName: type.FullName,
        typeKind: kind,
      };
      const typeAdd = (
        scope: SearchScope,
        text: string | null | undefined,
        field: string,
        category: SearchCategory = "other",
        extra: Partial<SearchRow> = {},
      ) => add(scope, text, field, category, { ...typeInfo, ...extra });

      typeAdd(kind, type.Name, "Name", "name");
      typeAdd(kind, type.FullName, "Full name", "name");
      typeAdd(kind, type.Namespace, "Namespace");
      typeAdd(kind, type.BaseType, "Base type");
      typeAdd(kind, type.DeclaringType, "Declaring type");
      for (const implemented of type.ImplementedInterfaces ?? []) {
        typeAdd(kind, implemented, "Implemented interface");
      }
      for (const value of type.Values ?? []) typeAdd(kind, value, "Enum value", "name");
      addAttributeRows(typeAdd, type.Attributes);
      memberRows(typeAdd, type);

      if (kind === "Delegate") {
        const signature = `${type.ReturnType ?? ""} ${type.Name}(${(type.Parameters ?? [])
          .map((parameter) => `${parameter.Type} ${parameter.Name}`)
          .join(", ")})`.trim();
        for (const parameter of type.Parameters ?? []) {
          typeAdd("Parameter", parameter.Name, "Name", "name", { memberName: type.Name, memberSignature: signature });
          typeAdd("Parameter", parameter.Type, "Type", "other", { memberName: type.Name, memberSignature: signature });
          typeAdd("Parameter", formatValue(parameter.DefaultValue), "Default value", "other", {
            memberName: type.Name,
            memberSignature: signature,
          });
          addAttributeRows(
            (scope, text, field, category) =>
              typeAdd(scope, text, field, category, { memberName: type.Name, memberSignature: signature }),
            parameter.Attributes,
          );
        }
      }
    }
  }
  return rows;
}

function trigrams(value: string): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i <= value.length - 3; i += 1) grams.add(value.slice(i, i + 3));
  return grams;
}

export function createSearchIndex(): SearchIndex {
  return { documents: [], trigrams: new Map() };
}

export function addRowsToIndex(index: SearchIndex, rows: SearchRow[]) {
  for (const row of rows) {
    const documentIndex = index.documents.length;
    const normalized = row.text.toLocaleLowerCase();
    const indexedRow = { ...row, id: documentIndex };
    index.documents.push({ row: indexedRow, normalized });
    for (const gram of trigrams(normalized)) {
      const positions = index.trigrams.get(gram);
      if (positions) positions.push(documentIndex);
      else index.trigrams.set(gram, [documentIndex]);
    }
  }
}

function candidatesFor(index: SearchIndex, query: string): number[] | null {
  if (query.length < 3) return null;
  const grams = [...trigrams(query)];
  const lists = grams.map((gram) => index.trigrams.get(gram));
  if (lists.some((list) => !list)) return [];
  const smallest = lists.reduce((a, b) => (a!.length <= b!.length ? a : b))!;
  const otherSets = lists.filter((list) => list !== smallest).map((list) => new Set(list));
  return smallest.filter((position) => otherSets.every((set) => set.has(position)));
}

function matchesFilters(row: SearchRow, filters: SearchFilters, includeScope: boolean): boolean {
  if (includeScope && filters.scopes.length > 0 && !filters.scopes.includes(row.scope)) return false;
  if (filters.typeKind !== "all" && row.typeKind !== filters.typeKind) return false;
  if (filters.origin !== "all" && row.origin !== filters.origin) return false;
  if (filters.category !== "all" && row.category !== filters.category) return false;
  if (filters.dllId !== null && row.dllId !== filters.dllId) return false;
  return true;
}

function relevance(text: string, query: string, category: SearchCategory): number {
  const base = text === query ? 300 : text.startsWith(query) ? 200 : 100;
  return base + (category === "name" ? 20 : category === "description" ? 10 : 0);
}

interface QueryContext {
  query: string;
  positions: number[];
  scopeCounts: Record<SearchScope, number>;
  matches: Array<{ row: SearchRow; score: number }>;
  matchedDlls: Set<number>;
}

function createQueryContext(index: SearchIndex, queryText: string): QueryContext {
  const query = queryText.trim().toLocaleLowerCase();
  const positions = candidatesFor(index, query) ?? index.documents.map((_, position) => position);
  return {
    query,
    positions,
    scopeCounts: Object.fromEntries(SEARCH_SCOPES.map((scope) => [scope, 0])) as Record<SearchScope, number>,
    matches: [],
    matchedDlls: new Set(),
  };
}

function collectMatch(context: QueryContext, index: SearchIndex, position: number, filters: SearchFilters) {
  const document = index.documents[position];
  if (!document.normalized.includes(context.query) || !matchesFilters(document.row, filters, false)) return;
  context.scopeCounts[document.row.scope] += 1;
  if (filters.scopes.length > 0 && !filters.scopes.includes(document.row.scope)) return;
  context.matchedDlls.add(document.row.dllId);
  context.matches.push({
    row: document.row,
    score: relevance(document.normalized, context.query, document.row.category),
  });
}

function finishQuery(
  context: QueryContext,
  offset: number,
  queryId: number,
): SearchResult {
  context.matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.row.dllName.localeCompare(b.row.dllName) ||
      (a.row.typeFullName ?? "").localeCompare(b.row.typeFullName ?? "") ||
      a.row.scope.localeCompare(b.row.scope),
  );
  return {
    queryId,
    rows: context.matches.slice(offset, offset + SEARCH_PAGE_SIZE).map(({ row }) => row),
    total: context.matches.length,
    dllCount: context.matchedDlls.size,
    scopeCounts: context.scopeCounts,
    offset,
  };
}

export function runQuery(
  index: SearchIndex,
  queryText: string,
  filters: SearchFilters,
  offset = 0,
  queryId = 0,
): SearchResult {
  const context = createQueryContext(index, queryText);
  if (context.query) {
    for (const position of context.positions) collectMatch(context, index, position, filters);
  }
  return finishQuery(context, offset, queryId);
}

export async function runQueryAsync(
  index: SearchIndex,
  queryText: string,
  filters: SearchFilters,
  offset: number,
  queryId: number,
  shouldCancel: () => boolean,
): Promise<SearchResult | null> {
  const context = createQueryContext(index, queryText);
  if (!context.query) return finishQuery(context, offset, queryId);

  for (let i = 0; i < context.positions.length; i += 1) {
    collectMatch(context, index, context.positions[i], filters);
    if ((i + 1) % 5000 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      if (shouldCancel()) return null;
    }
  }
  return shouldCancel() ? null : finishQuery(context, offset, queryId);
}

export function emptySearchFilters(): SearchFilters {
  return {
    scopes: [],
    typeKind: "all",
    origin: "all",
    category: "all",
    dllId: null,
  };
}
