import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import type { AuditDllRow, AuditSortKey } from "../../types/audit";
import {
  filterAuditRows,
  formatBytes,
  formatDate,
  formatDuration,
  sortAuditRows,
  statusColor,
} from "../../utils/auditUtils";

const Row: React.FC<{ row: AuditDllRow }> = ({ row }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(
    row.Reason ||
    row.Exception ||
    row.Warnings?.length ||
    row.Steps?.length ||
    row.FileHash ||
    row.FileSizeBytes
  );
  return (
    <>
      <TableRow hover>
        <TableCell padding="checkbox">
          {hasDetail && (
            <IconButton size="small" onClick={() => setOpen(!open)} aria-label="Toggle details">
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell sx={{ maxWidth: 240, wordBreak: "break-all" }}>{row.DllName}</TableCell>
        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{row.folder}</TableCell>
        <TableCell>
          <Chip size="small" color={statusColor(row.isNative ? "Native" : row.Status)} label={row.isNative ? "Native" : row.Status} />
        </TableCell>
        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{row.Result ?? "-"}</TableCell>
        <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
          {row.ProcessedTypesCount?.toLocaleString() ?? "-"}
        </TableCell>
        <TableCell align="right">{formatDuration(row.DurationMs)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ py: 1.5, display: "grid", gap: 0.5 }}>
              <Typography variant="caption" sx={{ wordBreak: "break-all" }}>Path: {row.DllPath}</Typography>
              <Typography variant="caption">
                Started: {formatDate(row.StartedAt)} · Ended: {formatDate(row.EndedAt)}
              </Typography>
              <Typography variant="caption">
                Size: {formatBytes(row.FileSizeBytes)} · Hash: {row.FileHash ?? "-"}
              </Typography>
              {row.Reason && <Typography variant="caption" color="warning.main">Reason: {row.Reason}</Typography>}
              {row.Exception && (
                <Typography variant="caption" color="error.main" sx={{ whiteSpace: "pre-wrap" }}>
                  {row.Exception}
                </Typography>
              )}
              {(row.Steps ?? []).length > 0 && (
                <Stepper orientation="vertical" sx={{ my: 0.5 }}>
                  {(row.Steps ?? []).map((s, i) => (
                    <Step key={`${s}-${i}`} active completed>
                      <StepLabel slotProps={{ label: { sx: { fontSize: 12 } } }}>{s}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}
              {(row.Warnings ?? []).map((w) => (
                <Typography key={w} variant="caption" color="warning.main">{w}</Typography>
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const DllTable: React.FC<{ rows: AuditDllRow[]; folders: string[] }> = ({ rows, folders }) => {
  const [status, setStatus] = useState("all");
  const [folder, setFolder] = useState("all");
  const [text, setText] = useState("");
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [sortKey, setSortKey] = useState<AuditSortKey>("DurationMs");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.Status))), [rows]);
  const processed = useMemo(
    () => sortAuditRows(filterAuditRows(rows, { status, folder, text, warningsOnly }), sortKey, dir),
    [rows, status, folder, text, warningsOnly, sortKey, dir],
  );
  const pageRows = processed.slice(page * pageSize, page * pageSize + pageSize);

  const headSort = (key: AuditSortKey, label: string, align?: "right") => (
    <TableCell align={align} sortDirection={sortKey === key ? dir : false}>
      <TableSortLabel
        active={sortKey === key}
        direction={sortKey === key ? dir : "asc"}
        onClick={() => {
          setDir(sortKey === key && dir === "asc" ? "desc" : "asc");
          setSortKey(key);
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Card variant="outlined">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ p: 2 }}>
        <TextField
          size="small"
          label="Search DLL"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPage(0);
          }}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">All</MenuItem>
          {statuses.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Folder"
          value={folder}
          onChange={(e) => {
            setFolder(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="all">All</MenuItem>
          {folders.map((f) => (
            <MenuItem key={f} value={f}>{f}</MenuItem>
          ))}
        </TextField>
        <Chip
          label="Has warnings"
          color="warning"
          variant={warningsOnly ? "filled" : "outlined"}
          onClick={() => {
            setWarningsOnly((v) => !v);
            setPage(0);
          }}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
        />
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              {headSort("DllName", "DLL")}
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                <TableSortLabel active={sortKey === "folder"} direction={sortKey === "folder" ? dir : "asc"} onClick={() => { setDir(sortKey === "folder" && dir === "asc" ? "desc" : "asc"); setSortKey("folder"); }}>
                  Folder
                </TableSortLabel>
              </TableCell>
              {headSort("Status", "Status")}
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Result</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                <TableSortLabel active={sortKey === "ProcessedTypesCount"} direction={sortKey === "ProcessedTypesCount" ? dir : "asc"} onClick={() => { setDir(sortKey === "ProcessedTypesCount" && dir === "asc" ? "desc" : "asc"); setSortKey("ProcessedTypesCount"); }}>
                  Types
                </TableSortLabel>
              </TableCell>
              {headSort("DurationMs", "Duration", "right")}
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.map((r) => (
              <Row key={`${r.folder}:${r.DllPath}`} row={r} />
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No DLLs match the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={processed.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Card>
  );
};
