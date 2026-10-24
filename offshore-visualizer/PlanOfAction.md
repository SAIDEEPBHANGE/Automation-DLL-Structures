### Plan of Action: Audit Page, MUI Migration, Utils Refactor, Rich Detail Drawer, Animated Responsive 3D Graph

Reference: `SampleJsonStructure.md` (Master Graph JSON, DLL Detail JSON, Audit JSON).

---

#### Step 1: Foundations (types, utils, routing)

- **Types** (`src/types/`):
  - `graph.ts`: unchanged (master graph, compact keys `i/n/fn/d/k`, `s/t`).
  - `detail.ts`: rewrite to mirror the real DLL Detail JSON (PascalCase): `Id, DllName, Version, FilePath, Metadata{AssemblyName, RuntimeVersion, ScanDate, ...}, Dependencies[{AssemblyName, Version, IsLocalDll, ReferencedJsonFile}], Classes, Interfaces, Structs, Enums, Delegates` with `Fields / Properties / Methods(Parameters) / Events`. Add a normalized view model (`DllDetailPayload`) with `dependencies` (outbound), `dependents` (inbound), `references`, `types`.
  - `audit.ts` (new): `AuditPayload, AuditFolder, AuditDll, AuditCounts, AuditIndexEntry`.
- **Utils** (`src/utils/`) — all business logic moves out of components and `App.tsx`:
  - `dllClassifier.ts`: `isVendorDll(name)`, `getArchitectureLabel`.
  - `graphUtils.ts`: `buildAdjacency`, `getConnectedDlls(data, id)` (inbound/outbound), `buildSearchOptions`, `getGraphStats`.
  - `detailMapper.ts`: `mapDllDetail(raw)`, flattening Classes/Interfaces/Structs/Enums/Delegates to `TypeDetailItem[]`, formatting method signatures, `resolveDetailUrl(suite, dll)`.
  - `fetchUtils.ts`: `fetchJson<T>(url, signal)` with HTTP error handling and abort support.
  - `auditUtils.ts`: `flattenAuditDlls`, `filterAuditRows(status, folder, text)`, `sortRows`, `formatDuration`, `formatDate`, `formatBytes`, `statusColor`, `buildStatusChartData`.
  - `threeUtils.ts`: `createLabelSprite`, `fibonacciSpherePosition`, color constants, `easeInOutCubic`, `computeFramingDistance`.
- **Audit data serving:** copy/serve `Backend-Audits/data/audit_*.json` and `api/latest-audit.json` into `public/data/audit/` (a small sync script `scripts/sync-audits.mjs` hooked into `predev`/`prebuild`; index = `latest-audit.json` list, which has `FileName` + `DisplayName`).
- **Routing:** lightweight state-based or `react-router-dom` routes: `/` (Graph) and `/audit` (Audit). Navbar buttons switch pages; selected suite state is preserved when navigating.

---

#### Step 2: Migrate UI to MUI components

- Add `ThemeProvider` + `CssBaseline` with a dark theme (`src/theme.ts`) matching existing palette (amber `#f59e0b`, sky `#38bdf8`, slate backgrounds).
- **Navbar** → `AppBar`/`Toolbar`, `Button` (Graph, **Audit**), `Select`/`ToggleButtonGroup` for suite, `Autocomplete` for DLL search, `Chip` for stats, `IconButton` + `Drawer` menu on small screens.
- **DetailDrawer** → MUI `Drawer` (anchor right, persistent), `Tabs/Tab`, `List`, `Accordion`, `Chip`, `Skeleton`, `TextField`, `IconButton` (close).
- **Loader** → `CircularProgress` / `LinearProgress` in a `Backdrop`.
- **Audit page** → `Grid`/`Stack`, `Card`, `Table` or `DataGrid`-style `Table` with `TablePagination`, `Select`, `TextField`, `Tabs`, `Alert`, `Skeleton`.
- Remove inline-style layout in favor of the `sx` prop.

---

#### Step 3: Audit Page (`src/pages/AuditPage.tsx` + `src/components/audit/*`)

- **Run selector:** `Select` populated from `index.json` (DisplayName), defaults to the latest; loads the chosen `audit_*.json`.
- **Run header cards:** RunId, Started/Ended, total duration, machine, process id, target framework, config (solution/audit folder/patterns).
- **Summary KPI cards:** Folders scanned, Total DLLs, Processed, Partially processed, Failed, Skipped, Native — color-coded, with count-up animation.
- **Folder section:** per-folder `Accordion`/cards with counts, duration, DLL count, progress bar (processed vs. total).
- **DLL table:** columns DLL name, folder, status chip, result, types count, duration, size/hash, reason/exception; search, status and folder filters, sort, pagination; row click expands warnings/reason/exception/steps.
- **Charts (MUI-only, no new dependency):** stacked `LinearProgress`/CSS bar for status distribution and a duration "top slowest DLLs" bar list.
- Handles empty / loading / error states (`Skeleton`, `Alert`).

---

#### Step 4: Detail Drawer — show the full information

Header: Assembly name, `#ID` chip, version, architecture/vendor chip, file path, runtime version, scan date.

Tabs:

1. **Overview:** metadata, type counts per kind (Classes/Interfaces/Structs/Enums/Delegates).
2. **Connected Nodes:** _Depends on_ (outbound) and _Used by_ (inbound) lists; click jumps and animates the camera; local vs. external references (`IsLocalDll`, version).
3. **Types / AST:** searchable, filterable by kind (chips); each type expands to namespace, base type, abstract/sealed, implemented interfaces, enum values, delegate signature, and members grouped into Fields, Properties (`get/set`), Methods (signature with parameters, static/virtual/abstract flags), Events.

- Skeleton loader while fetching; instant master metadata shown before chunk arrives; large type lists virtualised/paged (render first N, "show more") for performance.
- Becomes a bottom sheet (`SwipeableDrawer`, ~70vh) on mobile, full width at `xs`, 440px at `md+`.

---

#### Step 5: 3D Graph — one bubble per node, with ID inside

- Every node (DLL) is exactly one sphere (one `InstancedMesh` instance); the numeric ID must be visible on each bubble.
- **Approach:** an ID text atlas (one canvas texture holding digits/IDs) + per-instance billboard quads, or sprites for nearby nodes using LOD:
  - Always: color-coded bubble (blue normal, slate vendor).
  - Within a zoom threshold or when selected/neighbor: render the `#ID` label sprite centered on the bubble (name badge only for selected + 1-hop neighbors to prevent clutter).
  - Sprite pool reused (no per-frame allocation); textures cached and disposed.
- Highlight: selected = amber at 2×, neighbors = sky blue at 1.4×, others = dimmed charcoal; only edges touching the selection stay lit (vertex color update).
- Hover tooltip (MUI `Popper`) with name + ID via raycast.

---

#### Step 6: Animation

- **Camera:** eased fly-to (tween `easeInOutCubic`, ~700ms) to a node instead of an instant jump; smooth return on deselect.
- **Nodes:** animated scale/color lerp on select/hover (pulse on the focal node), edge opacity fade.
- **UI:** MUI `Slide` for drawer, `Fade`/`Grow` for audit cards, count-up KPI numbers, page transition fade.
- Respect `prefers-reduced-motion` (disable tweens and pulses).
- Single `requestAnimationFrame` loop; pause when the tab is hidden.

---

#### Step 7: Responsive behavior

- Canvas sizes from its container via `ResizeObserver` (not `100vw/100vh`), updates camera aspect and pixel ratio; scene is not rebuilt on resize.
- Camera framing adapts to aspect (portrait fits width).
- Breakpoints (MUI `useMediaQuery`): Navbar collapses to a menu below `md`; drawer becomes bottom sheet on `xs/sm`; audit table switches to horizontally scrollable/ card list on `xs`; KPI grid 1/2/4 columns.
- Touch support: tap-to-select, pinch/drag via OrbitControls.
- Remove stale `onNodeClick` dependency from the scene-setup effect (use a ref) so the renderer is not torn down on re-render.

---

#### Step 8: Execution Sequence

1. **Phase A:** types + `src/utils/*` + audit data sync script (no UI change; `App.tsx` switches to utils).
2. **Phase B:** MUI theme + Navbar (with Audit button) + routing.
3. **Phase C:** Audit page and sub-components.
4. **Phase D:** MUI DetailDrawer with full information tabs.
5. **Phase E:** 3D canvas refactor — `threeUtils`, ID on each bubble, animations, ResizeObserver.
6. **Phase F:** Responsive pass, reduced-motion, performance check (16k DLL audit rows, 2k+ nodes).
7. **Phase G:** Validate — `npm run lint`, `npm run build`, manual check at mobile/tablet/desktop widths for both suites.

---

#### Acceptance Criteria

- Navbar has an **Audit** button that opens a working Audit page using real audit JSON.
- All UI uses MUI components; business logic lives in `src/utils`.
- Drawer shows header metadata, connected in/out nodes, and full type/member details.
- Every graph node is a single bubble displaying its ID; selection animates smoothly.
- Layout works from 360px mobile to desktop; lint and build pass.
