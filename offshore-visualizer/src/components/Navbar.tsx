import React, { useState } from "react";
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Chip,
  createFilterOptions,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import HubIcon from "@mui/icons-material/Hub";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import TableChartIcon from "@mui/icons-material/TableChart";
import SearchIcon from "@mui/icons-material/Search";
import { NAV_HEIGHT } from "../theme";
import { SUITES, type SearchOption, type Suite } from "../utils/graphUtils";

export type Page = "graph" | "table" | "search" | "audit";

interface NavbarProps {
  page: Page;
  onPageChange: (page: Page) => void;
  currentSuite: Suite;
  onSuiteChange: (suite: Suite) => void;
  options: SearchOption[];
  onSelectNode: (nodeId: string) => void;
  stats?: {
    nodesCount: number;
    edgesCount: number;
    typeNodeCount: number;
    dllRefCount: number;
    typeRefCount: number;
    generatedAt?: string;
  };
}

const filterOptions = createFilterOptions<SearchOption>({ limit: 12 });

export const Navbar: React.FC<NavbarProps> = ({
  page,
  onPageChange,
  currentSuite,
  onSuiteChange,
  options,
  onSelectNode,
  stats,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const showStats = useMediaQuery(theme.breakpoints.up("lg"));
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const suiteSelect = (
    <Select
      size="small"
      value={currentSuite}
      onChange={(e) => onSuiteChange(e.target.value as Suite)}
      sx={{ minWidth: 150 }}
    >
      {SUITES.map((s) => (
        <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
      ))}
    </Select>
  );

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{ bgcolor: "rgba(15, 23, 42, 0.95)", borderBottom: 1, borderColor: "divider", zIndex: 1200 }}
    >
      <Toolbar sx={{ minHeight: NAV_HEIGHT, gap: 1.5 }}>
        <Typography variant="h6" noWrap sx={{ color: "primary.main", fontWeight: 700 }}>
          Off-Shore
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, display: { xs: "none", sm: "inline" } }}>
            Architecture Auditor
          </Typography>
        </Typography>

        {showStats && stats && (
          <Tooltip
            arrow
            title={
              <Box sx={{ fontSize: 12, lineHeight: 1.6 }}>
                <div>Type nodes: {stats.typeNodeCount.toLocaleString()}</div>
                <div>DLL references: {stats.dllRefCount.toLocaleString()}</div>
                <div>Type references: {stats.typeRefCount.toLocaleString()}</div>
                {stats.generatedAt && <div>Generated: {new Date(stats.generatedAt).toLocaleString()}</div>}
              </Box>
            }
          >
            <Box sx={{ display: "flex", gap: 1, ml: 1 }}>
              <Chip size="small" variant="outlined" label={`${stats.nodesCount.toLocaleString()} DLLs`} />
              <Chip size="small" variant="outlined" label={`${stats.edgesCount.toLocaleString()} Edges`} />
            </Box>
          </Tooltip>
        )}

        {!isMobile && (
          <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
            <Button
              startIcon={<HubIcon />}
              color={page === "graph" ? "primary" : "inherit"}
              variant={page === "graph" ? "outlined" : "text"}
              onClick={() => onPageChange("graph")}
            >
              Graph
            </Button>
            <Button
              startIcon={<TableChartIcon />}
              color={page === "table" ? "primary" : "inherit"}
              variant={page === "table" ? "outlined" : "text"}
              onClick={() => onPageChange("table")}
            >
              Table
            </Button>
            <Button
              startIcon={<SearchIcon />}
              color={page === "search" ? "primary" : "inherit"}
              variant={page === "search" ? "outlined" : "text"}
              onClick={() => onPageChange("search")}
            >
              Search
            </Button>
            <Button
              startIcon={<FactCheckIcon />}
              color={page === "audit" ? "primary" : "inherit"}
              variant={page === "audit" ? "outlined" : "text"}
              onClick={() => onPageChange("audit")}
            >
              Audit
            </Button>
          </Box>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {!isMobile && suiteSelect}

        <Autocomplete
          size="small"
          options={options}
          value={null}
          blurOnSelect
          filterOptions={filterOptions}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_, opt) => opt && onSelectNode(opt.id)}
          noOptionsText="No matching DLL"
          sx={{ width: { xs: "100%", sm: 260, lg: 320 }, maxWidth: { xs: 220, sm: "none" } }}
          renderInput={(params) => <TextField {...params} placeholder="Search DLL by name or ID..." />}
        />

        {isMobile && (
          <>
            <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Open menu">
              <MenuIcon />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
              <MenuItem
                selected={page === "graph"}
                onClick={() => {
                  onPageChange("graph");
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon><HubIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Graph</ListItemText>
              </MenuItem>
              <MenuItem
                selected={page === "table"}
                onClick={() => {
                  onPageChange("table");
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Table</ListItemText>
              </MenuItem>
              <MenuItem
                selected={page === "search"}
                onClick={() => {
                  onPageChange("search");
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon><SearchIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Search</ListItemText>
              </MenuItem>
              <MenuItem
                selected={page === "audit"}
                onClick={() => {
                  onPageChange("audit");
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon><FactCheckIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Audit</ListItemText>
              </MenuItem>
              {SUITES.map((s) => (
                <MenuItem
                  key={s.id}
                  selected={s.id === currentSuite}
                  onClick={() => {
                    onSuiteChange(s.id);
                    setMenuAnchor(null);
                  }}
                >
                  <ListItemText inset>{s.label}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};
