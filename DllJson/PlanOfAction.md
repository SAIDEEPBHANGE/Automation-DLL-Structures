# Revised Plan of Action

## **Phase 1: Deterministic Numeric IDs & Deduplication**
* Sort all scanned DLL file paths alphabetically before processing to ensure order consistency across runs.
* Assign sequential integer IDs (`1, 2, 3...`) to each DLL and type node instead of random GUIDs.
* Map relationships using these numeric IDs to minimize memory and payload size.
* Add a `HashSet` edge tracker in `ReferenceBuilder.cs` to eliminate duplicate edges between assemblies.




## **Phase 2: Implement Class-Level Graph Links (`BuildTypeReferences`)**
* Build an indexed lookup map of valid offshore types (`FullName -> NumericNodeId`).
* Add `BuildTypeReferences` in `ReferenceBuilder.cs` to traverse base types, interfaces, field types, and method signatures.


* Filter out standard .NET runtime types (`System.*`, `Microsoft.*`, `mscorlib`) to eliminate graph noise.
* Call `BuildTypeReferences` inside `AssemblyScanner.Scan()` right after `ExtractTypes`.




## **Phase 3: Serialization & Performance Optimization**
* Set `WriteIndented = false` across `Program.cs` and `AuditWriter.cs` to cut JSON file sizes in half.


* Parallelize writing the individual `Dlls/{id}.json` files using `Parallel.ForEach`.


* Generate a lightweight `master-graph.json` containing only numeric node IDs, labels, and source-to-target edge pairs for fast browser loading.




## **Phase 4: Frontend Development (React + TypeScript + WebGL)**
* Initialize a Vite + React + TypeScript static application deployable to Netlify.
* Integrate **Sigma.js / Graphology** to render the 50,000+ nodes and edges via WebGL at 60 FPS.
* Implement in-memory pathfinding (BFS / Dijkstra) for tracing dependency flows from Point A to Point B.
* Use MUI components for search bars, suite filters, and an on-demand drawer that fetches detailed DLL JSON on node selection.