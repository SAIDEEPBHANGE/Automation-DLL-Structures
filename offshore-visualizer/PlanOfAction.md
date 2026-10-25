### Plan of Action

Reference: `SampleJsonStructure.md`. Plan only; no code for the Search page is written yet.

Completed work (split layout, detail panel/sheet, colour modes, base-path fetch, earlier suites) has been removed from this document. `npm run lint` and `npm run build` pass.

---

#### 1. Goal: new "Search" page

A fourth Navbar page (Graph / Table / **Search** / Audit) to find anything across every DLL detail JSON of the selected suite, and show exactly *where* each match was found.

**Search input**
- One text box; matches **names** and **descriptions** (case-insensitive, substring; optional `Aa` case toggle and `.*` regex toggle later).
- Descriptions come from `DescriptionAttribute` arguments (and any attribute argument values), because detail JSON has no separate description field. Confirm with the backend owner if a dedicated `Description` field will be exported.

**Match scopes (what is searched)** - each result row is tagged with one of these:

| Scope | Source field |
|---|---|
| DLL | `DllName`, `Metadata.AssemblyName`, `FilePath`, `Version` |
| Reference | `Dependencies[].AssemblyName` |
| Class / Interface / Struct / Enum / Delegate | `Name`, `FullName`, `Namespace`, `BaseType`, `DeclaringType`, `ImplementedInterfaces[]`, enum `Values[]` |
| Method | `Name`, `ReturnType` |
| Parameter | `Name`, `Type`, `DefaultValue` |
| Property | `Name`, `Type` |
| Field | `Name`, `Type` |
| Event | `Name`, `Type` / `EventType` |
| Attribute | `Name`, argument keys and values (this is where descriptions are found) |

**Result table** (one row per match)

| Column | Notes |
|---|---|
| Found in | scope chip: Class, Interface, Method, Parameter, Field, ... (colour per scope) |
| Matched text | the matched field with the hit **highlighted**, plus which field matched (Name / Type / Description ...) |
| Member | member name and signature, when the match is inside a member |
| Type | owning type name, kind, namespace |
| DLL | assembly name and `#id`; click selects it and opens the detail panel |

Filters: scope multi-select, kind (Class / Interface / Struct / Enum / Delegate), origin (MSIL / Vendor), "Names only" / "Descriptions only", DLL (typeahead). Sort: relevance (exact > prefix > substring, name hits above description hits), DLL, type, scope. Summary strip above the table: "1,284 matches in 96 DLLs" with per-scope counts that double as filters.

Row click: panel on the left shows the DLL, switches to the Types tab, expands and scrolls to the matched type (reuse `openType`), and jumps the Graph camera to the DLL.

---

#### 2. Performance strategy (search must never lag)

Naive per-keystroke scanning of ~1,300 detail files (many MB) on the main thread would freeze the UI. Layers, in order of impact:

1. **Web Worker** owns loading, indexing and querying. The main thread only sends the query and receives results; typing and scrolling stay smooth.
2. **Lazy, progressive indexing.** Fetch detail files in the worker with a small concurrency pool (6) after the user first opens the Search page (or on idle when the app starts). Show progress ("Indexed 412 / 1,345 DLLs") and let search run on what is already indexed, flagged "partial results".
3. **Flat compact index**, built once per suite: parallel arrays of lower-cased strings plus numeric scope / DLL / type / member ids (no nested objects, no repeated JSON traversal). Strings are stored once per document row.
4. **Inverted token index** (tokens split on case changes, `.`, `_`, `<`, `>`, `,`) to get candidate rows for queries of 3+ chars; fall back to a linear scan of the flat array only for 1-2 char queries or for regex.
5. **Debounce and cancel.** 150 ms debounce; each query carries an id, the worker abandons stale queries (checks the id every ~5k rows) and only the newest result is applied.
6. **Cap and paginate.** The worker returns the top 500 by relevance plus total counts per scope; "Load more" fetches the next page. Counts are computed during the scan, not from the returned rows.
7. **Virtualised table** (render only visible rows, ~30 DOM rows) so thousands of results do not lag; highlight spans are built only for visible rows.
8. **React side:** `useDeferredValue` / `startTransition` for result updates; input state is separate from the query state; memoised row components.
9. **Cache.** Keep the built index in memory per suite; optionally persist to IndexedDB with a key of suite + `generatedAt` so a revisit does not refetch or reindex. Invalidate when `generatedAt` changes.
10. **Optional backend assist (later):** export one `search-index.json` per suite (flat rows: scope, text, dllId, type, member) so the browser downloads a single compressed file instead of 1,300 detail files. Biggest win for first-load time; frontend can fall back to step 2 if the file is missing.

Targets: typing latency under 50 ms on the main thread; query response under 100 ms once indexed; first usable results within about 2 s of opening the page.

---

#### 3. Tasks

**A. Foundations**
1. `src/types/search.ts`: `SearchScope`, `SearchRow`, `SearchQuery`, `SearchResult`, worker message types.
2. `src/utils/searchIndex.ts`: pure functions: `flattenDll(raw)` (rows per scope above), `tokenize`, `buildIndex`, `runQuery` (candidate lookup, scoring, scope counts, paging). No DOM / React so it is testable.
3. `src/workers/searchWorker.ts`: loads files with a concurrency pool (reuse `resolveDetailUrl` and base-path fetch), reports progress, answers queries, supports cancel.

**B. Page and UI**
1. `src/pages/SearchPage.tsx`: search box (autofocus, clear button, `/` shortcut), scope chips with counts, filters, progress bar, empty / no-match / loading states.
2. `src/components/search/SearchResultsTable.tsx`: virtualised table, highlight component, scope chips, row click handler. Add a small virtualisation dependency only if hand-rolled windowing is not enough.
3. `Navbar.tsx`: add `Search` to `Page` type, buttons and the mobile menu; `App.tsx`: route the page, use the shared `SplitLayout` so the left panel still shows the clicked DLL.
4. Click-through: select node, open Types tab, expand matched type (extend `DetailContent` with an optional `focusType` prop).

**C. Quality**
1. Unit tests for `flattenDll` / `runQuery` (needs a test runner; add Vitest) using a small inline fixture covering class, interface, method, parameter, field, event and a `DescriptionAttribute`.
2. Performance check: full SmartPlant 3D suite, record index time, memory, and query latency for 1, 3 and 10 character queries.
3. Responsive check at 360 / 768 / 1024 / 1440 px (results become stacked cards below 600 px).
4. `npm run lint`, `npm run build`, manual browser pass on both suites.

---

#### 4. Leftovers (carried over)

- Mapper fixture test: blocked until `public/data/Sample/Dlls/3_SmartPlant.PID.json` exists; the test runner added in 3.C unblocks the harness half.
- Backend: `fw` per DLL; export interface methods and attributes for all DLLs; optional `search-index.json` (2.10); regenerate `public/data`.
- Audit table warning-count column.
- Performance check of 17k audit rows and 2k+ graph nodes.
- Optional: `react-router-dom` (so Search results are linkable); sync script for `Backend-Audits/data` and `public/data`.

---

#### Execution Sequence

1. Foundations (A): types, flatten / index / query, worker; verify in the console on SmartPlant 3D.
2. Page and table (B) with progress and partial results.
3. Click-through into the detail panel.
4. Tests and performance pass (C); tune debounce, caps and concurrency from measurements.
5. Optional backend `search-index.json`, then IndexedDB cache.

#### Open questions

- Is `DescriptionAttribute` the only source of "description", or will a dedicated field be exported?
- Should search span both suites at once, or only the selected suite (plan assumes selected suite)?
- Is adding Vitest (and optionally a virtual-list library) acceptable?
