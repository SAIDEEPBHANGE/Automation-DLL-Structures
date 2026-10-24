# Project Understanding (Current Backend State)

## What this project does
`DllJson` is a .NET Framework 4.8 console application that scans DLL folders, extracts assembly/type metadata using Mono.Cecil, builds dependency graphs, and writes compact JSON outputs for downstream visualization.

## High-level flow
1. `Program.cs` loads folder configurations from `FoldersJson`.
2. For each folder, `AssemblyScanner.Scan()` loads managed DLLs and classifies native DLLs separately.
3. `TypeExtractor` + `MemberExtractor` extract types and members into model objects.
4. `ReferenceBuilder` builds:
   - DLL-level edges (`AssemblyGraph.References`)
   - Type-level edges (`AssemblyGraph.TypeReferences`)
5. Output generation:
   - Per-DLL detail files in `OutputPath/Dlls/{id}_{dll}.json`
   - One lightweight master graph JSON (configured file name, e.g., `SmartPlantPID.json`)
   - Audit run JSON via `AuditWriter` (including latest index in `api/latest-audit.json`)

## Current architecture
- **Models/**: graph, DLL/type/member DTOs, audit DTOs.
- **Services/AssemblyScanner.cs**: discovery, loading, deterministic ordering, orchestration.
- **Services/TypeExtractor.cs**: extracts classes/interfaces/structs/enums/delegates including nested types.
- **Services/MemberExtractor.cs**: extracts fields/properties/methods/events for classes.
- **Services/ReferenceBuilder.cs**: builds deduplicated DLL and type edges.
- **Services/NativeDllAnalyzer.cs**: PE metadata extraction for unmanaged DLLs.

## Status against the revised plan

### Phase 1: Deterministic Numeric IDs & Deduplication
- Implemented: DLLs are sorted by file path before processing.
- Implemented: DLL IDs are sequential numeric IDs.
- Implemented: type node IDs for classes/interfaces/structs are sequential numeric IDs.
- Implemented: DLL edge deduplication uses `HashSet<long>` in `BuildDllReferences`.

### Phase 2: Class-Level Graph Links (`BuildTypeReferences`)
- Implemented: indexed type lookup map (`FullName -> (TypeId, DllId)`).
- Implemented: class-level traversal includes base type, interfaces, fields, properties, method return types, and parameters.
- Implemented: framework-noise filtering for common prefixes (`System`, `Microsoft`, `mscorlib`, etc.).
- Implemented: called during `AssemblyScanner.Scan()` after type extraction.

### Phase 3: Serialization & Performance
- Implemented: minified JSON (`WriteIndented = false`) in `Program.cs` and `AuditWriter.cs`.
- Implemented: parallel writing of individual DLL detail files via `Parallel.ForEach`.
- Implemented: lightweight master graph payload with compact node/edge structure.

### Phase 4: Frontend (React + TypeScript + WebGL)
- Not present in this repository yet (backend-only codebase currently).

## Important implementation notes observed
- Folder targets and output paths are currently hardcoded in `Models/FoldersJson.cs`.
- Audit `RunId` is still a GUID (only graph node IDs are numeric/deterministic).
- Native PE parsing currently reads `IMAGE_OPTIONAL_HEADER_32`; PE32+ (x64 optional header layout) handling should be validated for full 64-bit reliability.
- `README.md` documents historical gaps; several listed backend gaps are already addressed in current code.
