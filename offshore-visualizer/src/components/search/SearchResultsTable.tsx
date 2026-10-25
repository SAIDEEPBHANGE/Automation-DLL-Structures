import React, { useMemo } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { SearchRow, SearchScope } from "../../types/search";

const SCOPE_COLORS: Record<SearchScope, "primary" | "secondary" | "success" | "warning" | "info" | "default"> = {
  DLL: "secondary",
  Reference: "default",
  Class: "primary",
  Interface: "info",
  Struct: "success",
  Enum: "warning",
  Delegate: "info",
  Method: "primary",
  Parameter: "default",
  Property: "secondary",
  Field: "warning",
  Event: "success",
  Attribute: "info",
};

function HighlightedText({ value, query }: { value: string; query: string }) {
  const parts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const position = normalized ? value.toLocaleLowerCase().indexOf(normalized) : -1;
    if (position < 0) return [{ text: value, highlighted: false }];
    return [
      { text: value.slice(0, position), highlighted: false },
      { text: value.slice(position, position + normalized.length), highlighted: true },
      { text: value.slice(position + normalized.length), highlighted: false },
    ];
  }, [value, query]);
  return (
    <>
      {parts.map((part, index) => (
        <Box
          component="span"
          key={`${index}-${part.text}`}
          sx={part.highlighted ? { bgcolor: "warning.main", color: "warning.contrastText", borderRadius: 0.5 } : undefined}
        >
          {part.text}
        </Box>
      ))}
    </>
  );
}

interface SearchResultsTableProps {
  rows: SearchRow[];
  query: string;
  onSelect: (row: SearchRow) => void;
}

export const SearchResultsTable: React.FC<SearchResultsTableProps> = ({ rows, query, onSelect }) => (
  <Box>
    <Stack spacing={1} sx={{ display: { xs: "flex", sm: "none" } }}>
      {rows.map((row) => (
        <Card
          key={row.id}
          variant="outlined"
          onClick={() => onSelect(row)}
          sx={{ p: 1.5, cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
            <Chip size="small" color={SCOPE_COLORS[row.scope]} label={row.scope} />
            <Typography variant="caption" color="text.secondary">{row.field}</Typography>
          </Stack>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere", mb: 1 }}>
            <HighlightedText value={row.text} query={query} />
          </Typography>
          {row.memberSignature && (
            <Typography component="div" variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {row.memberSignature}
            </Typography>
          )}
          <Typography component="div" variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {row.typeKind ? `${row.typeKind}: ${row.typeFullName ?? row.typeName}` : row.typeName ?? ""}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1 }}>
            <Typography variant="caption" sx={{ overflowWrap: "anywhere", flex: 1 }}>{row.dllName}</Typography>
            <Chip size="small" variant="outlined" label={`#${row.dllId}`} />
          </Stack>
        </Card>
      ))}
    </Stack>

    <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Found in</TableCell>
            <TableCell>Matched text</TableCell>
            <TableCell>Member</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>DLL</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              hover
              onClick={() => onSelect(row)}
              sx={{ cursor: "pointer", "& td": { verticalAlign: "top" } }}
            >
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Chip size="small" color={SCOPE_COLORS[row.scope]} label={row.scope} />
              </TableCell>
              <TableCell sx={{ minWidth: 200, overflowWrap: "anywhere" }}>
                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                  <HighlightedText value={row.text} query={query} />
                </Typography>
                <Typography variant="caption" color="text.secondary">{row.field}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 180, maxWidth: 320, overflowWrap: "anywhere" }}>
                {row.memberSignature ?? row.memberName ?? "—"}
              </TableCell>
              <TableCell sx={{ minWidth: 160, overflowWrap: "anywhere" }}>
                {row.typeKind ? (
                  <>
                    <Chip size="small" variant="outlined" label={row.typeKind} sx={{ mb: 0.5 }} />
                    <Typography variant="body2">{row.typeFullName ?? row.typeName}</Typography>
                  </>
                ) : "—"}
              </TableCell>
              <TableCell sx={{ minWidth: 170, maxWidth: 260 }}>
                <Button size="small" onClick={(event) => { event.stopPropagation(); onSelect(row); }}>
                  {row.dllName} #{row.dllId}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);
