### Plan of Action (Remaining Work)

Reference: `SampleJsonStructure.md` (revised).

Done and removed: everything from earlier plans plus the revised-sample work (parameter attribute chips, delegate parameters and Obsolete styling, attribute formatting with tooltips, audit Steps stepper, summary warnings alert, "Has warnings" filter, null-safe mapping, render loop paused when the tab is hidden). `tsc`, `eslint` and `vite build` pass.

---

#### Remaining

1. **Event link:** make an event's `EventType` jump to its delegate card in the same DLL (expand and scroll).
2. **Warning count column** in the audit DLL table (optional polish).
3. **Fixture test:** a small script that runs `mapDllDetail` on the revised sample and asserts attributes, delegate params and obsolete flags.
4. **Manual verification:** Graph, Table, Audit and drawer at mobile, tablet and desktop widths for both suites.
5. **Performance check:** ~17k audit rows and a 2k+ node scene.
6. **Optional:** `react-router-dom` URL routing; script to sync `Backend-Audits/data` into `public/data/Backend-Audits`.
