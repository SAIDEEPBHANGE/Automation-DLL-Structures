### Plan of Action (Remaining Work)

Reference: `SampleJsonStructure.md`.

Done and removed: everything from earlier plans, plus detail-view completeness (assembly name, framework chip, type full name / ID / "Nested in", parameter default values, referenced JSON file, type links grouped by kind, event type jumps to its delegate card, navbar stats tooltip with type / reference counts and generated time) and framework colouring (`frameworkUtils`, three.js colour mode, legend with Framework / Default toggle, Table framework column and filter). `tsc`, `eslint` and `vite build` pass.

---

#### Remaining

1. **Backend (needed for real colours):** add an optional `fw` (e.g. `"net48"`, `"net6.0"`, `"netstandard2.0"`) to each `dlls[]` item in the master graph. Until then every node is grey "Unknown", except the drawer, which falls back to `RuntimeVersion` from the detail file. The viewer already reads `fw`.
2. **Optional fallback:** pass the audit `TargetFramework` as a suite-level default when `fw` is missing.
3. **Audit table:** warning count column.
4. **Fixture test:** run `mapDllDetail` on the revised sample; assert attributes, delegate params, obsolete flags, `DeclaringType`, `DefaultValue`, type links.
5. **Manual verification:** Graph (both colour modes), Table, Audit and drawer at mobile / tablet / desktop for both suites.
6. **Performance check:** ~17k audit rows; 2k+ nodes (colour-mode switch only recolours instances).
7. **Optional:** `react-router-dom`; sync script for `Backend-Audits/data`.
