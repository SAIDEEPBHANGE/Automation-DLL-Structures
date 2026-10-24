### Plan of Action (Remaining Work)

Reference: `SampleJsonStructure.md` (Master Graph JSON, DLL Detail JSON, Audit JSON).

Completed and removed from this plan: foundations (types, utils, state-based page switching), MUI migration and Navbar with Audit and Table pages, Audit page, Table page, detail drawer (Overview, Connected, Types tabs, wider, structured method cards), 3D graph (one bubble per node with ID, highlight, hover tooltip, camera fly-to, pulse, ResizeObserver, reduced motion).

---

#### Part A: Revised `SampleJsonStructure.md` (DLL Detail JSON)

**What changed in the sample**

| Area | Before | Now |
|---|---|---|
| `Methods[].Attributes` | `[]` | `[{ "Name": "System.ObsoleteAttribute", "Arguments": { "message": "..." } }]` |
| `Events[]` | empty | `{ "Name": "DiagramChanged", "EventType": "SmartPlant.Core.DiagramChangedHandler" }` (already read by the mapper) |
| `Interfaces[].ImplementedInterfaces` | `[]` | populated (base interfaces, e.g. `IEntityService`) |
| `Fields[]/Parameters[]/Methods[].Attributes` | `[]` | same attribute shape (`Name` + `Arguments` object) |
| Master graph and Audit JSON | | unchanged |

**Gaps in current code**

- `types/detail.ts`: no `Attributes` on `RawField/RawMethod/RawParameter/RawType`; `Metadata` lacks `Culture`, `PublicKeyToken`; `Dependencies` lacks `ReferencedJsonFile`.
- `utils/detailMapper.ts`: attributes are dropped.
- `components/DetailDrawer.tsx`: no attribute UI; interface base types are labeled "Implements" (should be "Extends"); no Culture / PublicKeyToken.

**Tasks**

1. **Types:** add `RawAttribute { Name: string; Arguments?: Record<string, unknown> | null }` and optional `Attributes?: RawAttribute[]` on field, method, parameter and type. Add `Culture`, `PublicKeyToken` (Metadata) and `ReferencedJsonFile` (Dependencies). View models: `AttributeItem { name; args: Array<{ key; value }> }`, `MemberItem.attributes` and `isObsolete`, `MemberParam.attributes`, `ExternalReference.referencedJsonFile`, `DllDetailPayload.culture/publicKeyToken`.
2. **Mapper (`detailMapper.ts`):**
   - `mapAttributes()` strips the namespace and `Attribute` suffix (`System.ObsoleteAttribute` becomes `Obsolete`) and stringifies argument values safely (objects / null).
   - Derive `isObsolete` from the attribute list.
   - Use `ReferencedJsonFile` to resolve local dependencies to graph IDs when the name lookup fails.
3. **Drawer (`DetailDrawer.tsx`):**
   - Show attributes above each member as `[Obsolete("Use Load(DiagramDto, bool) instead.")]` chips; Obsolete uses a warning colour and a strikethrough member name.
   - Interface cards label base interfaces "Extends"; class and struct cards keep "Implements".
   - Overview tab shows Culture and Public key token when present.
   - Types tab gets an "Obsolete only" filter chip with a count.
4. **Audit and graph:** no change (shapes unchanged).

**Acceptance criteria**

- Attributes with arguments are visible on methods, fields and parameters; Obsolete members are visually flagged.
- Events show their `EventType` handler name.
- Interfaces show base interfaces under "Extends".
- Missing or null `Attributes`, `Arguments`, `Culture`, `PublicKeyToken` never throw (older JSON still loads).

---

#### Part B: Leftovers from the earlier plan

- **Manual verification:** browser check of the Graph, Table and Audit pages and the drawer at mobile, tablet and desktop widths for both suites (the code compiles and lints, but has not been exercised visually).
- **Performance check:** audit table with ~17k DLL rows and the 3D scene with 2k+ nodes (ID label pool, camera tweens).
- **Pause rendering when the tab is hidden** (the animation loop currently keeps running).
- **Optional:** real URL routing (`react-router-dom`) instead of state-based pages; a script to sync `Backend-Audits/data` into `public/data/Backend-Audits` (currently copied by hand).

---

#### Execution Sequence

1. Part A tasks 1–2 (types and mapper), checked against a fixture copy of the new sample structure.
2. Part A task 3 (drawer UI).
3. Part B leftovers.
4. Validate: `npx tsc -b`, `npx eslint src`, `npx vite build`, then manual checks.
