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
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { AttributeItem, DllDetailPayload, MemberItem, MemberKind, MemberParam, TypeDetailItem, TypeKind, TypeLink } from "../types/detail";
import { FRAMEWORK_LABEL, frameworkCss } from "../utils/frameworkUtils";
import { hasAnyAttribute } from "../utils/detailMapper";
import { NAV_HEIGHT, DRAWER_WIDTH } from "../theme";

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

const MEMBER_COLOR: Record<MemberKind, string> = {
  Method: "#38bdf8",
  Property: "#a78bfa",
  Field: "#fbbf24",
  Event: "#f472b6",
};
const TYPE_COLOR = "#5eead4";
const MONO = { fontFamily: 'Consolas, "Cascadia Mono", monospace', fontSize: 12.5 };

function formatAttribute(a: AttributeItem): string {
  const args =
    a.args.length === 1
      ? a.args[0].value
      : a.args.map((x) => `${x.key}=${x.value}`).join(", ");
  return `[${a.name}${args ? `(${args})` : ""}]`;
}

const AttributeChips: React.FC<{ attributes: AttributeItem[] }> = ({ attributes }) => (
  <>
    {attributes.map((a, i) => {
      const text = formatAttribute(a);
      return (
        <Tooltip key={`${a.name}-${i}`} title={text} enterDelay={300}>
          <Chip
            size="small"
            color={a.name === "Obsolete" ? "warning" : "default"}
            variant="outlined"
            label={text}
            sx={{
              height: "auto",
              maxWidth: "100%",
              fontSize: 11,
              "& .MuiChip-label": { whiteSpace: "normal", wordBreak: "break-word", py: 0.25 },
            }}
          />
        </Tooltip>
      );
    })}
  </>
);

/** Labelled, wrapping attribute line; renders nothing when there are no attributes. */
const AttributeLine: React.FC<{ attributes: AttributeItem[]; label?: string; sx?: object }> = ({
  attributes,
  label = "ATTRIBUTES",
  sx,
}) =>
  attributes.length === 0 ? null : (
    <Box sx={{ mb: 0.5, ...sx }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
        <AttributeChips attributes={attributes} />
      </Stack>
    </Box>
  );

const ParamList: React.FC<{ params: MemberParam[] }> = ({ params }) => (
  <Box sx={{ my: 0.5 }}>
    {params.map((p, i) => (
      <Box key={i} sx={{ pl: 2.5, py: 0.25 }}>
        <AttributeLine attributes={p.attributes} label="PARAM ATTRIBUTES" sx={{ mb: 0.25 }} />
        {p.modifier && <Box component="span" sx={{ color: "#f87171" }}>{p.modifier} </Box>}
        <Box component="span" sx={{ color: TYPE_COLOR }}>{p.type}</Box>{" "}
        <Box component="span" sx={{ color: "text.primary" }}>{p.name}</Box>
        {p.optional && (
          <Box component="span" sx={{ color: "text.secondary" }}> = {p.defaultValue ?? "optional"}</Box>
        )}
        {!p.optional && p.defaultValue && (
          <Box component="span" sx={{ color: "text.secondary" }}> = {p.defaultValue}</Box>
        )}
        {i < params.length - 1 && ","}
      </Box>
    ))}
  </Box>
);

const MemberRow: React.FC<{ member: MemberItem; onOpenType?: (name: string) => void }> = ({
  member: m,
  onOpenType,
}) => {
  return (
    <Box
      sx={{
        p: 1,
        borderLeft: 3,
        borderColor: MEMBER_COLOR[m.kind],
        bgcolor: "rgba(148, 163, 184, 0.06)",
        borderRadius: "0 6px 6px 0",
      }}
    >
      {m.flags.length > 0 && (
        <Stack direction="row" sx={{ mb: 0.5, flexWrap: "wrap", gap: 0.5 }}>
          {m.flags.map((f) => (
            <Chip key={f} size="small" label={f} sx={{ height: 18, fontSize: 10.5 }} />
          ))}
        </Stack>
      )}
      <AttributeLine attributes={m.attributes} />
      <Box
        sx={{
          ...MONO,
          wordBreak: "break-word",
          ...(m.isObsolete ? { textDecoration: "line-through", opacity: 0.75 } : {}),
        }}
      >
        {m.returnType && (
          <Box
            component="span"
            onClick={m.kind === "Event" && onOpenType ? () => onOpenType(m.returnType ?? "") : undefined}
            sx={{
              color: TYPE_COLOR,
              ...(m.kind === "Event" && onOpenType
                ? { cursor: "pointer", textDecoration: "underline dotted" }
                : {}),
            }}
          >
            {m.returnType}{" "}
          </Box>
        )}
        <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>{m.name}</Box>
        {m.kind === "Method" && (
          <>
            <Box component="span" sx={{ color: "text.secondary" }}>(</Box>
            {m.params.length > 0 ? (
              <ParamList params={m.params} />
            ) : (
              <Box component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}> no parameters </Box>
            )}
            <Box component="span" sx={{ color: "text.secondary" }}>)</Box>
          </>
        )}
        {m.accessors && (
          <Box component="span" sx={{ color: "text.secondary" }}> {m.accessors}</Box>
        )}
      </Box>
    </Box>
  );
};

const TypeCard: React.FC<{
  item: TypeDetailItem;
  expanded: boolean;
  onToggle: (key: string, open: boolean) => void;
  onOpenType: (name: string) => void;
}> = ({ item, expanded, onToggle, onOpenType }) => {
  const grouped = MEMBER_ORDER.map((k) => ({ kind: k, items: item.members.filter((m) => m.kind === k) })).filter(
    (g) => g.items.length > 0,
  );
  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={(_, open) => onToggle(item.key, open)}
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={{ bgcolor: "background.default" }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
          <Chip size="small" label={item.kind} color={KIND_COLOR[item.kind]} variant="outlined" />
          <Typography
            variant="body2"
            noWrap
            sx={item.isObsolete ? { textDecoration: "line-through", opacity: 0.75 } : undefined}
          >
            {item.name}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <InfoRow label="Namespace" value={item.namespace} />
        <InfoRow label="Full name" value={item.fullName} />
        <InfoRow label="Type ID" value={item.id !== undefined ? String(item.id) : undefined} />
        <InfoRow label="Nested in" value={item.declaringType} />
        <InfoRow label="Extends" value={item.baseType} />
        <InfoRow label="Signature" value={item.signature} />
        {item.delegateParams.length > 0 && (
          <Box sx={{ ...MONO, mb: 1 }}>
            <ParamList params={item.delegateParams} />
          </Box>
        )}
        {(item.flags.length > 0) && (
          <Stack direction="row" sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}>
            {item.flags.map((f) => (
              <Chip key={f} size="small" label={f} />
            ))}
          </Stack>
        )}
        <AttributeLine attributes={item.attributes} sx={{ mb: 1 }} />
        {item.interfaces.length > 0 && (
          <InfoRow
            label={`${item.kind === "Interface" ? "Extends" : "Implements"} (${item.interfaces.length})`}
            value={item.interfaces.join(", ")}
          />
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
          <Box key={g.kind} sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: MEMBER_COLOR[g.kind], letterSpacing: 0.5 }}>
              {g.kind.toUpperCase()}S ({g.items.length})
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 0.5 }}>
              {g.items.map((m, i) => (
                <MemberRow
                  key={`${m.name}-${i}`}
                  member={m}
                  onOpenType={m.kind === "Event" ? onOpenType : undefined}
                />
              ))}
            </Stack>
          </Box>
        ))}
        {item.kind === "Interface" && item.members.length === 0 && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1, fontStyle: "italic" }}>
            Members not exported for this interface.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

const LINKS_PAGE = 50;

const TypeLinksSection: React.FC<{ links: TypeLink[]; onJumpToNode: (id: string) => void }> = ({
  links,
  onJumpToNode,
}) => {
  const [kind, setKind] = useState("All");
  const [shown, setShown] = useState(LINKS_PAGE);
  const kinds = useMemo(() => Array.from(new Set(links.map((l) => l.kind))), [links]);
  const rows = useMemo(() => links.filter((l) => kind === "All" || l.kind === kind), [links, kind]);
  if (links.length === 0) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="overline" color="text.secondary">
        Type links ({links.length})
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5, mb: 1 }}>
        {["All", ...kinds].map((k) => (
          <Chip
            key={k}
            size="small"
            label={k}
            color={kind === k ? "primary" : "default"}
            variant={kind === k ? "filled" : "outlined"}
            onClick={() => {
              setKind(k);
              setShown(LINKS_PAGE);
            }}
          />
        ))}
      </Stack>
      <List dense disablePadding>
        {rows.slice(0, shown).map((l, i) => (
          <ListItemButton key={i} onClick={() => onJumpToNode(String(l.otherDllId))} sx={{ borderRadius: 1 }}>
            <ListItemText
              primary={
                l.direction === "out"
                  ? `${l.localType} → ${l.otherType}`
                  : `${l.otherType} → ${l.localType}`
              }
              secondary={`${l.direction === "out" ? "uses" : "used by"} ${l.otherDllName}`}
              slotProps={{ primary: { noWrap: true, sx: MONO } }}
            />
            <Chip size="small" variant="outlined" label={l.kind} />
          </ListItemButton>
        ))}
      </List>
      {rows.length > shown && (
        <Button fullWidth onClick={() => setShown((n) => n + LINKS_PAGE)}>
          Show more ({rows.length - shown} remaining)
        </Button>
      )}
    </Box>
  );
};

export const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose, detail, isLoading, onJumpToNode }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [tab, setTab] = useState(0);
  const [typeSearch, setTypeSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<TypeKind | "All">("All");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [obsoleteOnly, setObsoleteOnly] = useState(false);
  const [attrOnly, setAttrOnly] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const openType = (name: string) => {
    const target = detail?.types.find((t) => t.name === name);
    if (!target) return;
    setKindFilter("All");
    setObsoleteOnly(false);
    setTypeSearch(target.name);
    setVisible(PAGE_SIZE);
    setExpandedKey(target.key);
  };
  const toggleType = (key: string, open: boolean) => setExpandedKey(open ? key : null);

  const filtered = useMemo(() => {
    const q = typeSearch.trim().toLowerCase();
    return (detail?.types ?? []).filter(
      (t) =>
        (kindFilter === "All" || t.kind === kindFilter) &&
        (!obsoleteOnly || t.isObsolete || t.members.some((m) => m.isObsolete)) &&
        (!attrOnly || hasAnyAttribute(t)) &&
        (q === "" || t.name.toLowerCase().includes(q) || t.namespace.toLowerCase().includes(q)),
    );
  }, [detail, typeSearch, kindFilter, obsoleteOnly, attrOnly]);
  const attrTypeCount = useMemo(() => (detail?.types ?? []).filter(hasAnyAttribute).length, [detail]);

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
            width: isDesktop ? DRAWER_WIDTH : "100%",
            maxWidth: "100%",
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
                <Chip
                  size="small"
                  variant="outlined"
                  label={FRAMEWORK_LABEL[detail.framework]}
                  sx={{ borderColor: frameworkCss(detail.framework), color: frameworkCss(detail.framework) }}
                />
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
                {detail.assemblyName && detail.assemblyName !== detail.name && (
                  <InfoRow label="Assembly name" value={detail.assemblyName} />
                )}
                <InfoRow label="Runtime" value={detail.runtimeVersion} />
                <InfoRow label="Culture" value={detail.culture} />
                <InfoRow label="Public key token" value={detail.publicKeyToken} />
                {detail.obsoleteCount > 0 && (
                  <InfoRow label="Types with obsolete" value={String(detail.obsoleteCount)} />
                )}
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
                        <ListItemText
                          primary={r.name}
                          secondary={[r.version ? `v${r.version}` : "", r.referencedJsonFile ?? ""].filter(Boolean).join(" · ") || undefined}
                          slotProps={{ primary: { noWrap: true } }}
                        />
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
                <TypeLinksSection links={detail.typeLinks} onJumpToNode={onJumpToNode} />
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
                    {attrTypeCount > 0 && (
                      <Chip
                        size="small"
                        label={`With attributes (${attrTypeCount})`}
                        color="info"
                        variant={attrOnly ? "filled" : "outlined"}
                        onClick={() => {
                          setAttrOnly((v) => !v);
                          setVisible(PAGE_SIZE);
                        }}
                      />
                    )}
                    {detail.obsoleteCount > 0 && (
                      <Chip
                        size="small"
                        label={`Obsolete only (${detail.obsoleteCount})`}
                        color="warning"
                        variant={obsoleteOnly ? "filled" : "outlined"}
                        onClick={() => {
                          setObsoleteOnly((v) => !v);
                          setVisible(PAGE_SIZE);
                        }}
                      />
                    )}
                  </Stack>
                  <Stack spacing={0.75}>
                    {filtered.slice(0, visible).map((t) => (
                      <TypeCard
                        key={t.key}
                        item={t}
                        expanded={expandedKey === t.key}
                        onToggle={toggleType}
                        onOpenType={openType}
                      />
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
