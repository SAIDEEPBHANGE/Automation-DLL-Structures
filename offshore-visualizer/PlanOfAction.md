### Plan of Action (Remaining Work)

Reference: `SampleJsonStructure.md`. This document is a plan only; no code is changed yet.

Done and removed: foundations, Navbar with Graph / Table / Audit, drawer (attributes, Obsolete, delegates, type links, event jump, framework chip), audit steps / warnings / filter, 3D graph basics, render loop pause, framework colour mode and legend, Table framework column. `tsc`, `eslint` and `vite build` pass.

---

#### 1. Analysis: why the drawer looks incomplete

I compared the sample, the code and the real JSON in `public/data` (2,260 detail files, both suites).

| Observation | Result |
|---|---|
| Field, parameter and method `Attributes` in real files | 0 occurrences (all `[]`) |
| Interfaces with a non-empty `Methods` array in real files | 0 (interface methods are never exported) |
| Interfaces with `ImplementedInterfaces` | 3,131 (works) |
| Events with `EventType` | 425 files (works) |
| Code path for attributes on fields, params, methods, interface methods | Present (`mapAttributes`, `AttributeChips`, `ParamList`) |

**Conclusion.** The three reported gaps (class field attributes, method parameter attributes, interface methods with parameters and attributes) are mostly a **data gap**: the JSON currently in `public/data` was produced before the revised backend, so the viewer has nothing to show. The code path has never been exercised with real attribute data, so some rendering bugs may still be hiding. Remaining code risks found while reading:

- Attribute chips are placed in the same row as flags and are 18 px high with a single-line ellipsis; long `description` values are cut off (only the tooltip shows the whole text).
- Parameter attribute chips render only inside `ParamList`, which is used only for `Method` members; interface methods with no parameters show no parameter block, and a method's parameter attributes are hidden when the member list is collapsed or scrolled (`maxHeight: 360`).
- `Property` and `Event` members have attributes mapped but chips share the flag row, which is not rendered when there are no flags and no attributes; fine, but properties show no accessor attributes visually distinct from fields.
- No dev fixture exists, so nothing in the UI can be checked against the sample's shapes.
- The drawer treats a type with no `Methods` as "no methods" with no hint that interface members were not exported.

---

#### 2. Tasks

**A. Detail view completeness (class fields, method parameters, interface methods)**

1. Add a dev fixture `public/data/_fixtures/SampleSuite/` (master graph + `Dlls/3_SmartPlant.PID.json`) copied from `SampleJsonStructure.md`, selectable as a third suite ("Sample") so every shape is visible: field attributes, parameter attributes, Obsolete method, interface method with `Conditional` and parameter attribute, delegate with `Range` and `Obsolete`, enum, struct, event.
2. Rework the member card so attributes are always on their own labelled line (`ATTRIBUTES`) with wrapped, non-truncated chips (no fixed height; `whiteSpace: normal`) for fields, properties, methods and events.
3. Parameter rows: show parameter attributes above each parameter in every member kind, including interface methods; show "no parameters" for empty methods so the card is never ambiguous.
4. Interface cards: always render Methods and Properties groups; when an interface has none, show a muted "Members not exported for this interface" note.
5. Remove the 360 px inner scroll on member lists (let the drawer scroll) or raise it so parameter blocks are not clipped.
6. Add a "Show members with attributes only" filter chip next to "Obsolete only".
7. Backend request: export `Methods` and attributes for interfaces, and attributes on fields and parameters, for all 2,260 DLLs; regenerate `public/data` (copy by hand or via a sync script).
8. Unit-style fixture test (a Node script): run `mapDllDetail` on the fixture and assert every sample field is mapped (attributes on fields, params, methods, interface methods, delegates; `DeclaringType`, `DefaultValue`, event type).

**B. Node colour by table Origin (MSIL vs Vendor)**

The Table's "Origin" column uses `getArchitectureLabel` (`MSIL / .NET` vs `Vendor / Runtime`, based on `isVendorDll`). The graph will use the same logic.

1. New colour mode `"origin"` becomes the default; modes: `Origin`, `Framework`, `Default`.
2. Colours: MSIL / .NET = bright blue (existing `COLORS.normal`); Vendor / Runtime = amber/orange so it is clearly visible instead of near-black slate (today `COLORS.vendor` is `0x334155`, which is almost invisible on the dark background).
3. Move the classifier into a single `getOrigin(name)` (`"msil" | "vendor"`) in `dllClassifier.ts`, used by the Table, the graph colours, the legend and the drawer chip, so there is one logic source.
4. Legend (`FrameworkLegend` becomes `ColorLegend`): two rows with counts for Origin mode; Framework mode stays and shows only when any `fw` is present.
5. Drawer header chip and Table Origin chip use the same colours as the nodes.
6. Click on a legend row dims all other origins (quick filter).

**C. Expandable / contractible size with fixed width** (assumption, to confirm)

Interpreted as the detail drawer: a toggle button in its header that switches between two **fixed** widths (compact 420 px and expanded 680 px, today's `DRAWER_WIDTH`), remembered in `localStorage`; the Table page's right padding follows the active width; mobile keeps the bottom sheet (100 % width, 70 vh, expand to 92 vh). Each width is fixed (no free drag).
If you meant node size in the 3D scene (a size slider or +/- buttons with a fixed canvas width), tell me and I will replace this task.

---

#### 3. Leftovers

- Backend `fw` per DLL (optional) for the Framework mode.
- Audit table warning-count column.
- Browser check at mobile / tablet / desktop for both suites; performance check (17k audit rows, 2k+ nodes).
- Optional: `react-router-dom`; sync script for `Backend-Audits/data` and `public/data`.

---

#### Execution Sequence

1. Fixture and "Sample" suite (A1) so changes can be seen.
2. Member card, parameter, interface and filter changes (A2-A6).
3. Origin colouring, classifier refactor, legend (B).
4. Drawer width toggle (C).
5. Fixture test (A8), then `npx tsc -b`, `npx eslint src`, `npx vite build`, manual checks.
6. Backend data regeneration (A7) in parallel.
