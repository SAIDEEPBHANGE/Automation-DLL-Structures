import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import type { MasterGraphPayload } from "../types/graph";
import type { SearchFilters, SearchProgress, SearchResult, SearchRow, SearchScope, SearchWorkerResponse } from "../types/search";
import type { Suite } from "../utils/graphUtils";
import { SEARCH_PAGE_SIZE, SEARCH_SCOPES, emptySearchFilters } from "../utils/searchIndex";
import { postSearchWorkerMessage, subscribeToSearchWorker } from "../utils/searchWorkerClient";
import { SearchResultsTable } from "../components/search/SearchResultsTable";

const PAGE_SIZE = 30;
const EMPTY_COUNTS = Object.fromEntries(SEARCH_SCOPES.map((scope) => [scope, 0])) as Record<SearchScope, number>;

interface SearchPageProps {
  suite: Suite;
  data: MasterGraphPayload | null;
  isLoading: boolean;
  active: boolean;
  onSelectResult: (row: SearchRow) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ suite, data, isLoading, active, onSelectResult }) => {
  const [text, setText] = useState("");
  const [queryText, setQueryText] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(emptySearchFilters);
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  const [indexRevision, setIndexRevision] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(0);
  const queryId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeQueryId, setActiveQueryId] = useState(0);

  const dllOptions = useMemo(
    () => (data?.dlls ?? []).map((dll) => ({ id: dll.id, name: dll.name })),
    [data],
  );
  const selectedDll = dllOptions.find((dll) => dll.id === filters.dllId) ?? null;

  useEffect(() => {
    if (!active || isLoading || !data) return;
    postSearchWorkerMessage({
      type: "index",
      suite,
      generatedAt: data.generatedAt,
      dlls: data.dlls.map(({ id, name, detailFile }) => ({ id, name, detailFile })),
    });
  }, [active, data, isLoading, suite]);

  useEffect(() => {
    const unsubscribe = subscribeToSearchWorker((message: SearchWorkerResponse) => {
      if (message.type === "progress" && message.progress.suite === suite) {
        setProgress(message.progress);
        if (message.progress.complete || message.progress.indexed % 25 === 0) {
          setIndexRevision((revision) => revision + 1);
        }
      } else if (message.type === "results" && message.result.queryId === queryId.current) {
        setResult(message.result);
        setQueryLoading(false);
        setQueryError(null);
      } else if (message.type === "error" && message.suite === suite) {
        setQueryError(message.message);
        setQueryLoading(false);
      }
    });
    return unsubscribe;
  }, [suite]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      const value = text.trim();
      setQueryText(value);
      if (!value) {
        setResult(null);
        setQueryLoading(false);
        return;
      }
      const id = ++queryId.current;
      setActiveQueryId(id);
      setQueryLoading(true);
      setQueryError(null);
      postSearchWorkerMessage({
        type: "query",
        suite,
        queryId: id,
        text: value,
        filters,
        offset,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [active, filters, indexRevision, offset, suite, text]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!active || event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  const updateFilters = (patch: Partial<SearchFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setOffset(0);
    setPage(0);
  };

  const toggleScope = (scope: SearchScope) => {
    const scopes = filters.scopes.includes(scope)
      ? filters.scopes.filter((item) => item !== scope)
      : [...filters.scopes, scope];
    updateFilters({ scopes });
  };

  const currentResult = result?.queryId === activeQueryId ? result : null;
  const pageCount = Math.max(1, Math.ceil((currentResult?.rows.length ?? 0) / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount - 1);
  const visibleRows = currentResult?.rows.slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE) ?? [];
  const totalCount = currentResult?.total ?? 0;
  const canLoadMore = currentResult !== null && offset + currentResult.rows.length < totalCount;
  const scopeCounts = currentResult?.scopeCounts ?? EMPTY_COUNTS;
  const partial = !progress?.complete;

  return (
    <Box sx={{ height: "100%", overflowY: "auto", p: { xs: 1.5, sm: 2.5 } }}>
      <Stack spacing={2} sx={{ maxWidth: 1600, mx: "auto" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Search assembly details</Typography>
            <Typography variant="body2" color="text.secondary">
              Search names, signatures, references, attributes, and descriptions in {suite}.
            </Typography>
          </Box>
          {progress && (
            <Chip
              size="small"
              variant="outlined"
              label={`${progress.indexed.toLocaleString()} / ${progress.total.toLocaleString()} DLLs indexed`}
            />
          )}
        </Stack>

        {queryError && <Alert severity="error">{queryError}</Alert>}
        {progress?.failed ? (
          <Alert severity="warning">
            {progress.failed.toLocaleString()} DLL detail file(s) could not be indexed.
            {progress.lastError ? ` Latest failure: ${progress.lastError}` : ""}
          </Alert>
        ) : null}

        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            <TextField
              inputRef={inputRef}
              autoFocus={active}
              fullWidth
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setOffset(0);
                setPage(0);
              }}
              placeholder="Search classes, methods, descriptions..."
              slotProps={{
                input: {
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                endAdornment: text ? (
                  <Button size="small" onClick={() => { setText(""); setQueryText(""); }}>
                    Clear
                  </Button>
                ) : <Typography variant="caption" color="text.secondary">/</Typography>,
                },
              }}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                select
                size="small"
                label="Type kind"
                value={filters.typeKind}
                onChange={(event) => updateFilters({ typeKind: event.target.value as SearchFilters["typeKind"] })}
                sx={{ minWidth: { md: 160 } }}
              >
                <MenuItem value="all">All types</MenuItem>
                {(["Class", "Interface", "Struct", "Enum", "Delegate"] as const).map((kind) => (
                  <MenuItem key={kind} value={kind}>{kind}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Origin"
                value={filters.origin}
                onChange={(event) => updateFilters({ origin: event.target.value as SearchFilters["origin"] })}
                sx={{ minWidth: { md: 160 } }}
              >
                <MenuItem value="all">All origins</MenuItem>
                <MenuItem value="msil">MSIL</MenuItem>
                <MenuItem value="vendor">Vendor</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Text"
                value={filters.category}
                onChange={(event) => updateFilters({ category: event.target.value as SearchFilters["category"] })}
                sx={{ minWidth: { md: 180 } }}
              >
                <MenuItem value="all">Names and details</MenuItem>
                <MenuItem value="name">Names only</MenuItem>
                <MenuItem value="description">Descriptions only</MenuItem>
              </TextField>
              <Autocomplete
                size="small"
                options={dllOptions}
                value={selectedDll}
                onChange={(_, dll) => updateFilters({ dllId: dll?.id ?? null })}
                getOptionLabel={(dll) => `${dll.name} (#${dll.id})`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="DLL" placeholder="All DLLs" />}
                sx={{ flex: 1, minWidth: { md: 220 } }}
              />
            </Stack>

            <Box>
              <Typography variant="caption" color="text.secondary">Match scopes</Typography>
              <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.75, mt: 0.5 }}>
                {SEARCH_SCOPES.map((scope) => (
                  <Chip
                    key={scope}
                    size="small"
                    clickable
                    color={filters.scopes.includes(scope) ? "primary" : "default"}
                    variant={filters.scopes.includes(scope) ? "filled" : "outlined"}
                    label={`${scope} (${scopeCounts[scope]})`}
                    onClick={() => toggleScope(scope)}
                  />
                ))}
                {filters.scopes.length > 0 && (
                  <Button size="small" onClick={() => updateFilters({ scopes: [] })}>Clear scopes</Button>
                )}
              </Stack>
            </Box>
          </Stack>
        </Card>

        {progress && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={progress.total ? (progress.indexed / progress.total) * 100 : 0}
            />
            <Typography variant="caption" color="text.secondary">
              {progress.complete
                ? `Index complete${progress.failed ? ` with ${progress.failed} failed DLL(s)` : ""}`
                : `Indexing ${progress.indexed.toLocaleString()} of ${progress.total.toLocaleString()} DLLs${queryText ? " — results are partial" : ""}`}
            </Typography>
          </Box>
        )}

        {queryText && currentResult && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              {totalCount.toLocaleString()} matches in {currentResult.dllCount.toLocaleString()} DLLs
              {partial ? " · partial results while indexing" : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {queryLoading ? "Updating results…" : "Exact and prefix matches are ranked first"}
            </Typography>
          </Stack>
        )}

        {queryLoading && !currentResult && <CircularProgress size={28} sx={{ alignSelf: "center", my: 2 }} />}
        {queryText && currentResult && visibleRows.length === 0 && (
          <Alert severity="info">No matches found for “{queryText}”.</Alert>
        )}
        {!queryText && (
          <Alert severity="info">
            Enter at least one character to search the selected suite. Results become available as DLL details are indexed.
          </Alert>
        )}

        {visibleRows.length > 0 && (
          <Card variant="outlined">
            <SearchResultsTable rows={visibleRows} query={queryText} onSelect={onSelectResult} />
            <Stack
              direction="row"
              spacing={1}
              sx={{ p: 1.5, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
            >
              <Typography variant="caption" color="text.secondary">
                Showing {visiblePage * PAGE_SIZE + 1}–{Math.min((visiblePage + 1) * PAGE_SIZE, currentResult!.rows.length)} of {totalCount.toLocaleString()}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button disabled={visiblePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
                <Button disabled={visiblePage + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next</Button>
                {canLoadMore && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setOffset((value) => value + SEARCH_PAGE_SIZE);
                      setPage(0);
                    }}
                  >
                    Load more
                  </Button>
                )}
              </Stack>
            </Stack>
          </Card>
        )}
      </Stack>
    </Box>
  );
};
