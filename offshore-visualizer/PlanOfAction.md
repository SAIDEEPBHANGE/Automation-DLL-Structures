### Why This Is Happening (Root Causes)

1. **Camera Position Inside the Sphere on Load:**

- The calculated sphere radius for 8,400+ nodes is large ($R \approx 5,500+$), but the camera starts at a fixed distance or inside the shell. When inside the sphere, nodes sit behind the camera or get cut off by the near clipping plane until zoomed out.

2. **Camera Controls Target Mismatch:**

- `OrbitControls.target` is not bound to the sphere's geometric centroid, making default orbits pivot off-center.

3. **Frustum Near/Far Clipping:**

- The camera's `near` plane ($0.1$) vs `far` plane ($50,000$) ratio is too wide, causing depth-buffer precision issues where nearby instances disappear.

4. **CSS Layout Clipping / Navbar Offset:**

- The top white region / offset indicates the canvas container has fixed pixel offsets (`paddingTop: 60px`) mixed with `100vh`, displacing the WebGL viewport center.

---

### Plan of Action

- **1. Dynamic Bounding Sphere Framing (Auto-Fit Viewport)**
- Calculate the actual bounding sphere of all generated node positions upon data load.
- Compute the exact camera distance required based on field of view:

$$\text{distance} = \frac{\text{radius}}{\sin(\text{FOV} / 2)} \times 1.25$$

- Position the camera automatically outside the entire cluster so the whole architecture is visible on first render without manual zooming.

- **2. Camera & Frustum Boundary Tuning**
- Raise the camera `near` plane from $0.1$ to $10$ or $50$ to avoid near-plane geometry slicing when flying close to nodes.
- Adjust `OrbitControls` min/max distance constraints dynamically to prevent zooming completely through the sphere shell.

- **3. Viewport & CSS Alignment**
- Ensure the Three.js canvas container occupies `position: absolute; inset: 0` without height overflows or layout shifting.
- Set the renderer size using `mountRef.current.clientWidth` and `clientHeight` with an immediate resize dispatch after mount.

- **4. Target-Aware Camera Smooth Transition**
- When a node is selected from search or clicked, lerp the camera smoothly from outside the sphere to that specific node's coordinates, shifting the pivot target to that node.

Ready to apply these camera framing and viewport updates?
