import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Fade, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import type { AuditIndexEntry, AuditPayload } from "../types/audit";
import { AUDIT_BASE_URL, AUDIT_INDEX_URL, flattenAuditDlls, getSlowestDlls } from "../utils/auditUtils";
import { fetchJson } from "../utils/fetchUtils";
import { AuditSummaryCards, SlowestBars } from "../components/audit/AuditSummaryCards";
import { FolderPanels } from "../components/audit/FolderPanels";
import { DllTable } from "../components/audit/DllTable";

export const AuditPage: React.FC = () => {
  const [index, setIndex] = useState<AuditIndexEntry[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [result, setResult] = useState<{ file: string; audit: AuditPayload | null; error: string | null } | null>(
    null,
  );
  const [indexError, setIndexError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson<AuditIndexEntry[]>(AUDIT_INDEX_URL, ctrl.signal)
      .then((list) => {
        setIndex(list);
        if (list.length > 0) setSelected(list[list.length - 1].FileName);
        setIndexLoaded(true);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setIndexError(e.message);
        setIndexLoaded(true);
      });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const ctrl = new AbortController();
    fetchJson<AuditPayload>(`${AUDIT_BASE_URL}/${selected}`, ctrl.signal)
      .then((payload) => setResult({ file: selected, audit: payload, error: null }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setResult({ file: selected, audit: null, error: e.message });
      });
    return () => ctrl.abort();
  }, [selected]);

  const loading = !indexLoaded || (!!selected && result?.file !== selected);
  const audit = result?.file === selected ? result.audit : null;
  const error = indexError ?? (result?.file === selected ? result.error : null);

  const rows = useMemo(() => (audit ? flattenAuditDlls(audit) : []), [audit]);
  const slowest = useMemo(
    () => getSlowestDlls(rows, 8).map((r) => ({ name: r.DllName, ms: r.DurationMs ?? 0 })),
    [rows],
  );

  return (
    <Box sx={{ height: "100%", overflowY: "auto", p: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={2.5} sx={{ maxWidth: 1400, mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Audit Report
          </Typography>
          {index.length > 0 && (
            <TextField select size="small" label="Audit run" value={selected} onChange={(e) => setSelected(e.target.value)} sx={{ minWidth: { sm: 320 } }}>
              {index.map((e) => (
                <MenuItem key={e.FileName} value={e.FileName}>
                  {e.DisplayName}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        {error && <Alert severity="error">Failed to load audit data: {error}</Alert>}
        {!error && !loading && index.length === 0 && <Alert severity="info">No audit runs found.</Alert>}

        {loading && (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={140} />
            <Skeleton variant="rounded" height={90} />
            <Skeleton variant="rounded" height={320} />
          </Stack>
        )}

        {audit && !loading && (
          <Fade in timeout={500}>
            <Stack spacing={2.5}>
              <AuditSummaryCards audit={audit} />
              <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
                <FolderPanels folders={audit.Folders} />
                <SlowestBars items={slowest} />
              </Box>
              <DllTable rows={rows} folders={audit.Folders.map((f) => f.FolderName)} />
            </Stack>
          </Fade>
        )}
      </Stack>
    </Box>
  );
};
