### Plan of Action: Visual Node IDs & Detailed Slide-Out Inspection Drawer

---

#### Step 1: Render Visual Numbers/Labels on Nodes

- **Sprite / Billboarding Strategy:**
- Since `InstancedMesh` handles sphere geometry efficiently on the GPU, add a dynamic billboard label overlay:
- Option A (Screen Overlay): Position a floating 2D HTML/Canvas tooltip showing the assembly name and numeric ID on hover and for neighbor nodes.
- Option B (Sprite Text / Canvas Texture): Generate dynamic 2D canvas texture sprites for focused and neighbor nodes so IDs render directly above the 3D spheres.

- Prevent visual clutter: Only render text IDs for the selected node and its direct 1-hop neighbors (or during closer zoom thresholds).

---

#### Step 2: Refine Neighbor Highlighting & Edge Isolation

- **Visual Contrast:**
- **Selected Focal Node:** Amber (`#f59e0b`), scaled up to $2\times$ size.
- **1-Hop Neighbors:** Sky Blue (`#38bdf8`), scaled to $1.4\times$ size.
- **Background Nodes:** Deep charcoal (`#111827`) with dimmed opacity.

- **Edge Highlighting:**
- Update edge vertex colors dynamically so only edges connected directly to the selected node stay illuminated, while all unrelated cross-mesh lines disappear.

---

#### Step 3: Implement the Right Slide-Out Inspection Drawer

- **Asynchronous Chunk Fetcher:**
- When a node is clicked, extract its `detailFile` path from master metadata.
- Trigger an asynchronous fetch to `/data/{suite}/Dlls/{detailFile}` to load the full AST model.

- Show a localized skeleton loader inside the drawer during the request.

- **Drawer Structure & Information Architecture:**
- **Header Section:**
- Assembly Name, Numeric ID (`#ID`), Version, and Subsystem / Vendor classification.
- Close button (`✕`) to deselect and reset the camera.

- **Connected Nodes Section (Dependencies):**
- List of upstream assemblies (consumed by this DLL) and downstream assemblies (dependencies required).
- _Interactive jump:_ Clicking any connected neighbor in the list immediately pivots the 3D camera to that node.

- **Detailed AST & Type Hierarchy:**
- Type breakdowns: Classes, Interfaces, Structs, Enums.
- Member inspector: Methods, Properties, and Field signatures extracted during the IL scan.

---

#### Step 4: Execution Sequence

1. **Phase A:** Build the right slide-out drawer UI (`src/components/DetailDrawer.tsx`) and define the chunk JSON types.
2. **Phase B:** Wire the lazy-load fetch into `src/App.tsx` and connect the drawer state.
3. **Phase C:** Add node ID overlay tags / billboard labels on the Three.js canvas for active neighbors.
