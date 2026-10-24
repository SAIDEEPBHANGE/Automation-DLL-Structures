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
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import HubIcon from "@mui/icons-material/Hub";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import { NAV_HEIGHT } from "../theme";
import type { SearchOption, Suite } from "../utils/graphUtils";

export type Page = "graph" | "audit";

interface NavbarProps {
  page: Page;
  onPageChange: (page: Page) => void;
  currentSuite: Suite;
  onSuiteChange: (suite: Suite) => void;
  options: SearchOption[];
  onSelectNode: (nodeId: string) => void;
  stats?: { nodesCount: number; edgesCount: number };
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
      <MenuItem value="SmartPlant3D">SmartPlant 3D</MenuItem>
      <MenuItem value="SmartPlantPID">SmartPlant P&amp;ID</MenuItem>
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
          <Box sx={{ display: "flex", gap: 1, ml: 1 }}>
            <Chip size="small" variant="outlined" label={`${stats.nodesCount.toLocaleString()} DLLs`} />
            <Chip size="small" variant="outlined" label={`${stats.edgesCount.toLocaleString()} Edges`} />
          </Box>
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
                selected={page === "audit"}
                onClick={() => {
                  onPageChange("audit");
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon><FactCheckIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Audit</ListItemText>
              </MenuItem>
              {(["SmartPlant3D", "SmartPlantPID"] as Suite[]).map((s) => (
                <MenuItem
                  key={s}
                  selected={s === currentSuite}
                  onClick={() => {
                    onSuiteChange(s);
                    setMenuAnchor(null);
                  }}
                >
                  <ListItemText inset>{s === "SmartPlant3D" ? "SmartPlant 3D" : "SmartPlant P&ID"}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};
