import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  Chip,
  MenuItem,
  Skeleton,
  Stack,
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
import type { MasterGraphPayload } from "../types/graph";
import { DRAWER_WIDTH } from "../theme";
import { FRAMEWORK_LABEL, FRAMEWORK_ORDER, frameworkCss, type FrameworkFamily } from "../utils/frameworkUtils";
import {
  buildTableRows,
  filterTableRows,
  sortTableRows,
  type TableSortKey,
  type VendorFilter,
} from "../utils/tableUtils";

interface GraphTablePageProps {
  data: MasterGraphPayload | null;
  isLoading: boolean;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  /** Reserve room on the right while the detail drawer is open on wide screens. */
  drawerOpen: boolean;
}

const hideXs = { display: { xs: "none", sm: "table-cell" } };

export const GraphTablePage: React.FC<GraphTablePageProps> = ({
  data,
  isLoading,
  selectedNodeId,
  onSelectNode,
  drawerOpen,
}) => {
  const [text, setText] = useState("");
  const [vendor, setVendor] = useState<VendorFilter>("all");
  const [fwFilter, setFwFilter] = useState<FrameworkFamily | "all">("all");
  const [sortKey, setSortKey] = useState<TableSortKey>("id");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(() => buildTableRows(data), [data]);
  const visible = useMemo(
    () => sortTableRows(filterTableRows(rows, text, vendor, fwFilter), sortKey, dir),
    [rows, text, vendor, fwFilter, sortKey, dir],
  );
  const pageRows = visible.slice(page * pageSize, page * pageSize + pageSize);

  const head = (key: TableSortKey, label: string, align?: "right", sx?: object) => (
    <TableCell align={align} sx={sx} sortDirection={sortKey === key ? dir : false}>
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
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        p: { xs: 1.5, sm: 3 },
        pr: { md: drawerOpen ? `${DRAWER_WIDTH + 24}px` : 3 },
        transition: "padding-right 0.25s ease",
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 1400, mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between" }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Assemblies
          </Typography>
          {data && (
            <Stack direction="row" spacing={1}>
              <Chip size="small" variant="outlined" label={`${data.dlls.length.toLocaleString()} DLLs`} />
              <Chip size="small" variant="outlined" label={`${data.dllEdges.length.toLocaleString()} edges`} />
            </Stack>
          )}
        </Stack>

        {isLoading ? (
          <Skeleton variant="rounded" height={420} />
        ) : (
          <Card variant="outlined">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ p: 2 }}>
              <TextField
                size="small"
                label="Search by name or ID"
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
                label="Origin"
                value={vendor}
                onChange={(e) => {
                  setVendor(e.target.value as VendorFilter);
                  setPage(0);
                }}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="own">Application</MenuItem>
                <MenuItem value="vendor">Vendor / Runtime</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Framework"
                value={fwFilter}
                onChange={(e) => {
                  setFwFilter(e.target.value as FrameworkFamily | "all");
                  setPage(0);
                }}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="all">All</MenuItem>
                {FRAMEWORK_ORDER.map((f) => (
                  <MenuItem key={f} value={f}>{FRAMEWORK_LABEL[f]}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {head("id", "ID")}
                    {head("name", "Assembly")}
                    {head("version", "Version", undefined, hideXs)}
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Origin</TableCell>
                    {head("framework", "Framework", undefined, { display: { xs: "none", md: "table-cell" } })}
                    {head("outbound", "Depends on", "right")}
                    {head("inbound", "Used by", "right")}
                    {head("typeCount", "Types", "right", hideXs)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow
                      key={r.id}
                      hover
                      selected={String(r.id) === selectedNodeId}
                      onClick={() => onSelectNode(String(r.id))}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Chip size="small" color="secondary" variant="outlined" label={`#${r.id}`} />
                      </TableCell>
                      <TableCell sx={{ wordBreak: "break-all" }}>{r.name}</TableCell>
                      <TableCell sx={hideXs}>{r.version}</TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        <Chip size="small" variant="outlined" color={r.isVendor ? "default" : "primary"} label={r.architecture} />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={FRAMEWORK_LABEL[r.framework]}
                          sx={{ borderColor: frameworkCss(r.framework), color: frameworkCss(r.framework) }}
                        />
                      </TableCell>
                      <TableCell align="right">{r.outbound}</TableCell>
                      <TableCell align="right">{r.inbound}</TableCell>
                      <TableCell align="right" sx={hideXs}>
                        {r.typeCount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No assemblies match the filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={visible.length}
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
        )}
      </Stack>
    </Box>
  );
};
