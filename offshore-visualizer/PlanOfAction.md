### Plan of Action (Implementation Status)

Reference: `SampleJsonStructure.md`.

Implemented on 2026-10-25: canvas/table split layout with a docked desktop detail panel, mobile swipeable detail sheet, empty suite summary, responsive selection flows, cross-fade detail changes, reduced-motion handling, and Origin / Default canvas colour modes. Framework classification remains available in the detail panel and table.

Validation: `npm run lint` and `npm run build` pass. The mapper fixture test remains blocked: `public/data/Sample/Dlls/3_SmartPlant.PID.json` is not present, and the visualizer has no source-level test harness.

Done and removed: foundations, Navbar (Graph / Table / Audit), audit page, Table page, drawer (attributes on fields / params / methods / interface methods, Obsolete, delegates, type links, event jump, "With attributes" and "Obsolete only" filters, "no parameters" and "not exported" notes), "Sample" fixture suite, Origin colouring (MSIL blue / Vendor orange) with the shared `getOrigin` classifier, render loop pause. `tsc`, `eslint` and `vite build` pass.

---

#### 1. New layout: canvas right, drawer always visible (desktop)

Today the drawer is a temporary overlay that opens on node click. New behaviour:

| Screen | Layout |
|---|---|
| Desktop / laptop (`md` and up, >= 900 px) | Split view on the Graph page: **detail panel on the left (30 %)**, **3D canvas on the right (70 %)**. The panel is always visible. |
| Mobile / tablet (< 900 px) | Canvas is full width. The detail panel is a modal bottom sheet that opens on node click and closes with a close button / swipe / backdrop. A floating "Details" button reopens it for the last selected node. |

Notes
- "Canvas to the right side" is read as: panel left, canvas right. If you meant the opposite, only the flex order changes.
- Table page: same split (table on the right 70 %, panel left 30 %) so both pages behave alike. Audit page stays full width, no panel.
- When no node is selected, the panel shows an empty state: suite summary (DLL count, edges, generated date, origin counts) and a hint "Click a node or search to see details".

#### 2. Tasks

**A. Layout (App + theme)**
1. `theme.ts`: remove the fixed `DRAWER_WIDTH`; add `PANEL_WIDTH_PERCENT = 30` and breakpoint constant `SPLIT_BREAKPOINT = "md"`.
2. `App.tsx`: wrap the Graph and Table pages in a `SplitLayout` (new `src/components/SplitLayout.tsx`): MUI `Box` flex row, panel `flexBasis: 30 %` (min 340 px, max 560 px), content `flex: 1`, height `calc(100vh - NAV_HEIGHT)`, each pane scrolls independently.
3. Use `useMediaQuery(theme.breakpoints.up("md"))` once in `App` and pass `isDesktop` down.
4. Canvas resize: `ThreeGraphCanvas` already uses a `ResizeObserver`; verify it re-fits when the pane width changes (no window-resize dependence). Remove the right padding hacks in `GraphTablePage`.
5. Camera focus: the selected node centres in the visible 70 % pane, so no offset for the old overlay is needed (remove it if present).

**B. Detail panel (`DetailDrawer.tsx`)**
1. Split the component: `DetailContent` (header, tabs, cards; layout-agnostic) and thin wrappers: `DetailPanel` (docked, desktop) and `DetailSheet` (MUI `Drawer anchor="bottom"`, temporary, mobile, 85 vh, with a drag-handle bar and close icon).
2. Desktop: no close button needed; a "Clear selection" icon returns to the empty state.
3. Remove the width toggle task (obsolete: width is now 30 %); drop the `localStorage` idea.
4. Empty-state component (`DetailEmpty`) described in section 1.
5. Selected node and search keep working; selecting from the Table row also fills the panel.

**C. Colour modes (graph canvas)**
1. Remove the **Framework** option and its legend rows from the canvas toggle; modes are only `Origin` (default) and `Default`. Do not change Origin or Default behaviour.
2. `ColorMode = "origin" | "default"`; delete `FRAMEWORK_THREE_COLORS` and `getDllFramework` use inside `ThreeGraphCanvas`, and the `frameworkCounts` computation in `App`.
3. Legend becomes `ColorLegend` (rename from `FrameworkLegend`): the two-option toggle and the Origin rows only.
4. Keep framework data elsewhere (drawer chip, Table Framework column and filter) because the user only asked to remove it from the canvas; confirm if those should go as well.
5. Move the legend so it does not overlap the panel: stay at the canvas bottom-left (now inside the 70 % pane).

**D. Responsive and animation**
1. Mobile sheet slide-up transition (MUI default); respect `prefers-reduced-motion`.
2. Panel content cross-fades when the selected node changes (`Fade`, 150 ms).
3. Breakpoint tests: 360, 768, 1024, 1440 px; the 30 % panel never gets narrower than 340 px (below that width use the sheet).

**E. Cleanup and validation**
1. Remove now-unused code: drawer overlay props, `DRAWER_WIDTH` imports, framework canvas pieces.
2. Update the mapper fixture test (still pending) to run on `public/data/Sample/Dlls/3_SmartPlant.PID.json` asserting attributes, `DeclaringType`, `DefaultValue`, event type and type links.
3. `npx tsc -b`, `npx eslint src`, `npx vite build`; manual browser check on both suites and the Sample suite.

---

#### 3. Leftovers

- Backend: `fw` per DLL (no longer used by the canvas, still used by the drawer / table); export interface methods and attributes for all DLLs; regenerate `public/data`.
- Audit table warning-count column.
- Performance check (17k audit rows, 2k+ nodes).
- Optional: `react-router-dom`; sync script for `Backend-Audits/data` and `public/data`.

---

#### Execution Sequence

1. Colour modes cleanup (C): complete.
2. Split detail content / panel / sheet plus empty state (B): complete.
3. `SplitLayout`, theme constants and `App` wiring for Graph and Table (A): complete.
4. Responsive and animation polish (D): complete.
5. Cleanup and validation (E): complete; mapper fixture test blocked on the missing fixture and test harness.
