### Critical Issues & Gaps Identified

* **`TypeReferences` Are Never Populated:**
* `AssemblyScanner.cs` extracts types and builds DLL references, but it never calls any method to generate type-to-type links.
* `graph.TypeReferences` remains empty at the end of every scan, meaning class-level and interface-level dependency paths cannot be traced.


* **Non-Deterministic Node IDs:**
* `DllInfo.cs` generates a random `Guid.NewGuid().ToString()` on every execution.
* Every time you re-run the scanner, all node IDs change, which breaks frontend caching, bookmarks, and cross-run comparisons.


* **Duplicate Edges in Reference Building:**
* `ReferenceBuilder.BuildDllReferences` does not deduplicate assembly references.


* If multiple assemblies reference the same target, duplicate edges are added into `graph.References`.




* **System/CLR Noise Will Flood the Graph:**
* `TypeExtractor.cs` and `MemberExtractor.cs` capture all types without filtering out standard library contracts (`System.*`, `mscorlib`, `Microsoft.*`).
* Connecting base types like `System.Object`, `System.String`, or `System.IDisposable` will create tens of thousands of meaningless edges that choke the UI.


* **Massive Payload Size via Indented Serialization:**
* `Program.cs` and `AuditWriter.cs` serialize all outputs with `WriteIndented = true`.
* Across thousands of types and references, whitespace and indentation bloat file sizes by 40% to 60%, slowing down static hosting and browser parsing.


* **Sequential Disk I/O Bottleneck:**
* `Program.cs` iterates through `graph.Dlls` and writes each `.json` file to disk one by one using a single-threaded `foreach`.
* This significantly slows down the scan when processing hundreds of SmartPlant assemblies.


* **Native DLL Analyzer Lacks 64-bit PE Support:**
* `NativeDllAnalyzer.cs` defines and reads only `IMAGE_OPTIONAL_HEADER_32`.
* When analyzing 64-bit unmanaged DLLs (`PE32+` / `0x020b`), struct offsets misalign, causing corrupted subsystem and OS version readings.


* **Isolated Folder Scopes:**
* `FoldersJson.cs` scans `SmartPlantPID` and `SmartPlant3D` in separate loops into separate directories.
* Any shared cross-suite dependencies between P&ID and 3D are lost because they are not resolved in a unified lookup table.