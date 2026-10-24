# Off-Shore: SmartPlant Dependency & Architecture Auditor

A zero-cost, static architectural visualization and dependency audit platform designed to analyze, trace, and inspect 50,000+ SmartPlant assemblies, classes, and native components without persistent database overhead.

---

## Technical Stack Architecture

### 1. Data Ingestion & Static Analysis (Backend)

* **Framework:** .NET Framework 4.8 / C#
* **IL Disassembly & Type Reflection:** `Mono.Cecil` (deep inspection of types, interfaces, members, field types, and method signatures)
* **Unmanaged Binary Parsing:** Custom C# Win32 PE Parser (`IMAGE_DOS_HEADER`, `IMAGE_FILE_HEADER`, `IMAGE_OPTIONAL_HEADER_32` for native C++ binary and subsystem verification)
* **Determinism & Performance:**
* Alphabetically pre-sorted file discovery paired with sequential integer ID allocation (`1, 2, 3...`)
* Packed 64-bit compound keys (`(long)sourceId << 32 | (uint)targetId`) for zero-allocation edge deduplication
* Parallelized disk I/O (`Parallel.ForEach`) with minified serialization (`WriteIndented = false`)



### 2. Static Delivery & Persistence

* **Hosting:** Netlify (100% static asset delivery, zero database infrastructure costs)
* **Tiered Data Architecture:**
* **Master Graph (`SmartPlant3D.json`, `SmartPlantPID.json`):** Lightweight graph topology containing node IDs, short labels, and adjacency matrices for instant browser rendering.


* **Lazy-Loaded Chunks (`Dlls/{id}_{name}.json`):** Detailed AST models loaded on demand upon node selection.




* **Audit Registry:** `Backend-Audits/data/api/latest-audit.json` maintaining build history, execution runtimes, and health metrics.



### 3. Visualization & User Interface (Frontend)

* **Core Application:** React 18+ with TypeScript
* **Tooling & Bundler:** Vite (ES modules, fast builds, static production rollup)
* **Graph Engine:** **Graphology** (in-memory bidirectional graph model, indexed traversals, BFS and Dijkstra shortest-path calculations)
* **WebGL Renderer:** **Sigma.js v2** (GPU-accelerated rendering capable of handling 50k+ nodes and 120k+ edges at 60 FPS)
* **Background Computing:** Dedicated Web Worker for off-thread **ForceAtlas2** layout processing to prevent main thread blocking
* **Design & Controls:** Material UI (MUI v5) & Emotion (quick-search autocomplete, dependency drawers, and namespace filtering)
* **State Management:** Zustand (graph view states and suite selection) + TanStack Query (cached async retrieval of detailed DLL chunks)

---

## System Capabilities

* **Dual-Level Inspection:**
* **Assembly View:** Global visualization of 1,200 to 8,400 DLL assemblies and their inter-package linkages.
* **Type Drill-Down:** Explorable 66,000+ class, interface, and struct nodes with member-level call dependencies.


* **Domain vs. Vendor Filtering:** Isolate core SmartPlant domain modules by toggling framework and third-party dependencies (`Telerik`, `Microsoft`, `CefSharp`).


* **Automated Pathfinding:** Real-time dependency path resolution between any two components across suites.
* **On-Demand AST Inspector:** Slide-out inspection drawer detailing inheritance hierarchies, methods, properties, and field signatures.