import { describe, expect, it } from "vitest";
import type { RawDllDetail } from "../types/detail";
import {
  addRowsToIndex,
  createSearchIndex,
  emptySearchFilters,
  flattenDll,
  runQuery,
  runQueryAsync,
} from "./searchIndex";

const fixture: RawDllDetail = {
  Id: 27,
  DllName: "ExampleAssembly",
  Version: "2.4.1",
  FilePath: "C:\\assemblies\\ExampleAssembly.dll",
  Metadata: { AssemblyName: "ExampleAssembly.Metadata" },
  Dependencies: [{ AssemblyName: "Core.Dependency", Version: "1.0" }],
  Classes: [
    {
      Name: "ExampleClass",
      FullName: "Example.Namespace.ExampleClass",
      Namespace: "Example.Namespace",
      ImplementedInterfaces: ["Example.Namespace.IExample"],
      Fields: [{ Name: "FieldValue", Type: "System.String" }],
      Properties: [{ Name: "DisplayName", Type: "System.String" }],
      Methods: [
        {
          Name: "RunTask",
          ReturnType: "System.Boolean",
          Parameters: [{ Name: "taskName", Type: "System.String", DefaultValue: "daily" }],
          Attributes: [{ Name: "System.ComponentModel.DescriptionAttribute", Arguments: { Description: "Runs scheduled tasks" } }],
        },
      ],
      Events: [{ Name: "TaskCompleted", EventType: "System.EventHandler" }],
      Attributes: [{ Name: "System.ComponentModel.DescriptionAttribute", Arguments: { Description: "A useful example class" } }],
    },
  ],
  Interfaces: [{ Name: "IExample", FullName: "Example.Namespace.IExample", Namespace: "Example.Namespace" }],
  Enums: [{ Name: "TaskState", FullName: "Example.Namespace.TaskState", Values: ["Ready", "Complete"] }],
  Delegates: [
    {
      Name: "TaskCallback",
      FullName: "Example.Namespace.TaskCallback",
      ReturnType: "System.Void",
      Parameters: [{ Name: "completed", Type: "System.Boolean" }],
    },
  ],
};

function buildFixtureIndex() {
  const index = createSearchIndex();
  addRowsToIndex(index, flattenDll(fixture, "msil"));
  return index;
}

describe("search index", () => {
  it("flattens DLL metadata, references, type kinds, members, parameters, and attributes", () => {
    const rows = flattenDll(fixture, "msil");
    const scopes = new Set(rows.map((row) => row.scope));

    expect(scopes).toEqual(new Set([
      "DLL",
      "Reference",
      "Class",
      "Interface",
      "Enum",
      "Delegate",
      "Method",
      "Parameter",
      "Field",
      "Property",
      "Event",
      "Attribute",
    ]));
    expect(rows).toContainEqual(expect.objectContaining({
      scope: "Attribute",
      text: "Runs scheduled tasks",
      field: "Description",
      category: "description",
      typeName: "ExampleClass",
      memberName: "RunTask",
    }));
    expect(rows).toContainEqual(expect.objectContaining({ scope: "Enum", text: "Complete", field: "Enum value" }));
  });

  it("matches case-insensitive substrings and ranks name matches above descriptions", () => {
    const result = runQuery(buildFixtureIndex(), "xamplecl", emptySearchFilters());

    expect(result.rows[0]).toEqual(expect.objectContaining({ text: "ExampleClass", category: "name" }));
    expect(result.total).toBeGreaterThan(1);
    expect(result.dllCount).toBe(1);
  });

  it("returns matching description-attribute values and honors category/scope filters", () => {
    const filters = { ...emptySearchFilters(), category: "description" as const, scopes: ["Attribute" as const] };
    const result = runQuery(buildFixtureIndex(), "scheduled tasks", filters);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      field: "Description",
      scope: "Attribute",
      memberName: "RunTask",
    }));
    expect(result.scopeCounts.Attribute).toBe(1);
    expect(result.scopeCounts.Method).toBe(0);
  });

  it("filters type kinds and origins while calculating scope counts", () => {
    const index = buildFixtureIndex();
    addRowsToIndex(index, flattenDll({ ...fixture, Id: 28, DllName: "VendorAssembly" }, "vendor"));
    const filters = {
      ...emptySearchFilters(),
      typeKind: "Interface" as const,
      origin: "vendor" as const,
    };
    const result = runQuery(index, "iexample", filters);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.typeKind === "Interface" && row.origin === "vendor")).toBe(true);
    expect(result.scopeCounts.Interface).toBe(2);
    expect(result.dllCount).toBe(1);
  });

  it("abandons an asynchronous query when a newer query supersedes it", async () => {
    const index = createSearchIndex();
    addRowsToIndex(index, Array.from({ length: 600 }, (_, i) =>
      flattenDll({ ...fixture, Id: i + 1, DllName: `ExampleAssembly${i}` }, "msil"),
    ).flat());
    let cancellationChecks = 0;
    const result = await runQueryAsync(
      index,
      "Example",
      emptySearchFilters(),
      0,
      42,
      () => {
        cancellationChecks += 1;
        return cancellationChecks > 1;
      },
    );

    expect(result).toBeNull();
    expect(cancellationChecks).toBeGreaterThan(1);
  });
});
