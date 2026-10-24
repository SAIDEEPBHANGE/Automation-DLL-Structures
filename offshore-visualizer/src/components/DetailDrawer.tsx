import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { DllDetailPayload, MemberKind, TypeDetailItem, TypeKind } from "../types/detail";
import { NAV_HEIGHT } from "../theme";

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  detail: DllDetailPayload | null;
  isLoading: boolean;
  onJumpToNode: (nodeId: string) => void;
}

const PAGE_SIZE = 40;
const KINDS: TypeKind[] = ["Class", "Interface", "Struct", "Enum", "Delegate"];
const MEMBER_ORDER: MemberKind[] = ["Method", "Property", "Field", "Event"];
const KIND_COLOR: Record<TypeKind, "primary" | "secondary" | "success" | "warning" | "info"> = {
  Class: "primary",
  Interface: "secondary",
  Struct: "success",
  Enum: "warning",
  Delegate: "info",
};

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) =>
  value ? (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
        {value}
      </Typography>
    </Box>
  ) : null;

const TypeCard: React.FC<{ item: TypeDetailItem }> = ({ item }) => {
  const grouped = MEMBER_ORDER.map((k) => ({ kind: k, items: item.members.filter((m) => m.kind === k) })).filter(
    (g) => g.items.length > 0,
  );
  return (
    <Accordion disableGutters slotProps={{ transition: { unmountOnExit: true } }} sx={{ bgcolor: "background.default" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <Chip size="small" label={item.kind} color={KIND_COLOR[item.kind]} variant="outlined" />
          <Typography variant="body2" noWrap>
            {item.name}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <InfoRow label="Namespace" value={item.namespace} />
        <InfoRow label="Extends" value={item.baseType} />
        <InfoRow label="Signature" value={item.signature} />
        {item.flags.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
            {item.flags.map((f) => (
              <Chip key={f} size="small" label={f} />
            ))}
          </Stack>
        )}
        {item.interfaces.length > 0 && (
          <InfoRow label={`Implements (${item.interfaces.length})`} value={item.interfaces.join(", ")} />
        )}
        {item.enumValues.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Values ({item.enumValues.length})
            </Typography>
            <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
              {item.enumValues.map((v) => (
                <Chip key={v} size="small" variant="outlined" label={v} />
              ))}
            </Stack>
          </Box>
        )}
        {grouped.map((g) => (
          <Box key={g.kind} sx={{ mt: 1 }}>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
              {g.kind}s ({g.items.length})
            </Typography>
            <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
              {g.items.map((m, i) => (
                <Typography
                  key={`${m.name}-${i}`}
                  variant="caption"
                  component="div"
                  sx={{ fontFamily: "monospace", py: 0.25, wordBreak: "break-word" }}
                >
                  {m.signature}
                  {m.flags.length > 0 && (
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      {"  "}[{m.flags.join(", ")}]
                    </Box>
                  )}
                </Typography>
              ))}
            </Box>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose, detail, isLoading, onJumpToNode }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [tab, setTab] = useState(0);
  const [typeSearch, setTypeSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<TypeKind | "All">("All");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = typeSearch.trim().toLowerCase();
    return (detail?.types ?? []).filter(
      (t) =>
        (kindFilter === "All" || t.kind === kindFilter) &&
        (q === "" || t.name.toLowerCase().includes(q) || t.namespace.toLowerCase().includes(q)),
    );
  }, [detail, typeSearch, kindFilter]);

  const totalTypes = detail?.types.length ?? 0;

  const renderConnected = (title: string, items: Array<{ id: number; name: string }>) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.secondary">
        {title} ({items.length})
      </Typography>
      <List dense disablePadding sx={{ maxHeight: 260, overflowY: "auto" }}>
        {items.map((d) => (
          <ListItemButton key={d.id} onClick={() => onJumpToNode(String(d.id))} sx={{ borderRadius: 1 }}>
            <ListItemText primary={d.name} slotProps={{ primary: { noWrap: true } }} />
            <Chip size="small" color="primary" variant="outlined" label={`#${d.id}`} />
          </ListItemButton>
        ))}
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1, fontStyle: "italic" }}>
            None registered in the topology graph.
          </Typography>
        )}
      </List>
    </Box>
  );

  return (
    <Drawer
      variant="persistent"
      anchor={isDesktop ? "right" : "bottom"}
      open={isOpen && !!detail}
      slotProps={{
        paper: {
          sx: {
            width: isDesktop ? 440 : "100%",
            height: isDesktop ? `calc(100% - ${NAV_HEIGHT}px)` : "70vh",
            top: isDesktop ? NAV_HEIGHT : "auto",
            bgcolor: "rgba(15, 23, 42, 0.97)",
            backdropFilter: "blur(12px)",
            borderRadius: isDesktop ? 0 : "12px 12px 0 0",
          },
        },
      }}
    >
      {detail && (
        <>
          <Box sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ mb: 1, flexWrap: "wrap" }}>
                <Chip size="small" color="secondary" label={`#${detail.id}`} />
                <Chip size="small" color="primary" variant="outlined" label={detail.architecture} />
                {detail.version && <Chip size="small" label={`v${detail.version}`} />}
              </Stack>
              <Typography variant="h6" sx={{ wordBreak: "break-word", lineHeight: 1.25 }}>
                {detail.name}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Close drawer">
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />
          <Tabs value={tab} onChange={(_, v: number) => setTab(v)} variant="fullWidth">
            <Tab label="Overview" />
            <Tab label={`Connected (${detail.dependencies.length + detail.dependents.length})`} />
            <Tab label={isLoading ? "Types…" : `Types (${totalTypes})`} />
          </Tabs>
          <Divider />

          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {tab === 0 && (
              <>
                <InfoRow label="File path" value={detail.filePath} />
                <InfoRow label="Runtime" value={detail.runtimeVersion} />
                <InfoRow label="Scan date" value={detail.scanDate ? new Date(detail.scanDate).toLocaleString() : undefined} />
                <Typography variant="overline" color="text.secondary">
                  Type breakdown
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rounded" height={32} />
                ) : (
                  <Stack direction="row" sx={{ mb: 2, flexWrap: "wrap", gap: 0.75 }}>
                    {KINDS.map((k) => (
                      <Chip key={k} size="small" color={KIND_COLOR[k]} variant="outlined" label={`${k}: ${detail.typeCounts[k]}`} />
                    ))}
                  </Stack>
                )}
                <Typography variant="overline" color="text.secondary">
                  Assembly references ({detail.references.length})
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rounded" height={90} />
                ) : (
                  <List dense disablePadding sx={{ maxHeight: 260, overflowY: "auto" }}>
                    {detail.references.map((r) => (
                      <ListItemButton
                        key={r.name}
                        disabled={r.graphId === undefined}
                        onClick={() => r.graphId !== undefined && onJumpToNode(String(r.graphId))}
                        sx={{ borderRadius: 1 }}
                      >
                        <ListItemText primary={r.name} secondary={r.version ? `v${r.version}` : undefined} slotProps={{ primary: { noWrap: true } }} />
                        <Chip size="small" variant="outlined" label={r.isLocal ? "local" : "external"} />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </>
            )}

            {tab === 1 && (
              <>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  Click an assembly to fly the camera to it.
                </Typography>
                {renderConnected("Depends on", detail.dependencies)}
                {renderConnected("Used by", detail.dependents)}
              </>
            )}

            {tab === 2 &&
              (isLoading ? (
                <Stack spacing={1}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} variant="rounded" height={44} />
                  ))}
                </Stack>
              ) : totalTypes === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 2 }}>
                  No AST chunk found for this assembly. Showing topology metrics only.
                </Typography>
              ) : (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Filter by name or namespace..."
                    value={typeSearch}
                    onChange={(e) => {
                      setTypeSearch(e.target.value);
                      setVisible(PAGE_SIZE);
                    }}
                    sx={{ mb: 1 }}
                  />
                  <Stack direction="row" sx={{ mb: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                    {(["All", ...KINDS] as const).map((k) => (
                      <Chip
                        key={k}
                        size="small"
                        label={k === "All" ? `All (${totalTypes})` : `${k} (${detail.typeCounts[k]})`}
                        color={kindFilter === k ? "primary" : "default"}
                        variant={kindFilter === k ? "filled" : "outlined"}
                        onClick={() => {
                          setKindFilter(k);
                          setVisible(PAGE_SIZE);
                        }}
                      />
                    ))}
                  </Stack>
                  <Stack spacing={0.75}>
                    {filtered.slice(0, visible).map((t) => (
                      <TypeCard key={t.key} item={t} />
                    ))}
                  </Stack>
                  {filtered.length > visible && (
                    <Button fullWidth sx={{ mt: 1 }} onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      Show more ({filtered.length - visible} remaining)
                    </Button>
                  )}
                  {filtered.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ p: 2 }}>
                      No types match the filter.
                    </Typography>
                  )}
                </>
              ))}
          </Box>
        </>
      )}
    </Drawer>
  );
};
