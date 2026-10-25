import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, Fade, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { MasterGraphPayload } from "./types/graph";
import type { DllDetailPayload, RawDllDetail } from "./types/detail";
import { ThreeGraphCanvas } from "./components/ThreeGraphCanvas";
import { Navbar, type Page } from "./components/Navbar";
import { Loader } from "./components/Loader";
import { DetailPanel, DetailSheet } from "./components/DetailDrawer";
import { AuditPage } from "./pages/AuditPage";
import { GraphTablePage } from "./pages/GraphTablePage";
import { ColorLegend, type ColorMode } from "./components/ColorLegend";
import { SplitLayout } from "./components/SplitLayout";
import { getOrigin, type DllOrigin } from "./utils/dllClassifier";
import { fetchJson } from "./utils/fetchUtils";
import { buildInitialDetail, mapDllDetail } from "./utils/detailMapper";
import { buildSearchOptions, getGraphStats, resolveDetailUrl, type Suite } from "./utils/graphUtils";
import { SPLIT_BREAKPOINT } from "./theme";

export const App: React.FC = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up(SPLIT_BREAKPOINT));
  const [page, setPage] = useState<Page>("graph");
  const [data, setData] = useState<MasterGraphPayload | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<Suite>("SmartPlant3D");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [loadedSuite, setLoadedSuite] = useState<Suite | null>(null);
  const isLoading = loadedSuite !== selectedSuite;

  // Result of the AST chunk fetch, keyed by suite + node (null detail = fetch failed)
  const [fetched, setFetched] = useState<{ key: string; detail: DllDetailPayload | null } | null>(null);

  const handleSuiteChange = useCallback((suite: Suite) => {
    setSelectedNode(null);
    setMobileSheetOpen(false);
    setSelectedSuite(suite);
    setPage((p) => (p === "audit" ? "graph" : p));
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchJson<MasterGraphPayload>(`/data/${selectedSuite}/${selectedSuite}.json`, ctrl.signal)
      .then((payload) => {
        setData(payload);
        setLoadedSuite(selectedSuite);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        console.error("Failed to load topology:", err);
        setLoadedSuite(selectedSuite);
      });
    return () => ctrl.abort();
  }, [selectedSuite]);

  const selectedDll = useMemo(
    () => (data && selectedNode ? data.dlls.find((d) => d.id === parseInt(selectedNode, 10)) : undefined),
    [data, selectedNode],
  );
  const initialDetail = useMemo(
    () => (data && selectedDll ? buildInitialDetail(data, selectedDll) : null),
    [data, selectedDll],
  );
  const detailKey = selectedDll ? `${selectedSuite}:${selectedDll.id}` : null;

  // Master metadata shows immediately; the AST chunk is lazy-loaded
  useEffect(() => {
    if (!data || !selectedDll || !initialDetail || !detailKey) return;
    const ctrl = new AbortController();
    fetchJson<RawDllDetail>(resolveDetailUrl(selectedSuite, selectedDll), ctrl.signal)
      .then((raw) => setFetched({ key: detailKey, detail: mapDllDetail(raw, initialDetail, data) }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setFetched({ key: detailKey, detail: null });
      });
    return () => ctrl.abort();
  }, [data, selectedDll, initialDetail, detailKey, selectedSuite]);

  const isDetailLoading = !!detailKey && fetched?.key !== detailKey;
  const nodeDetail = fetched?.key === detailKey && fetched?.detail ? fetched.detail : initialDetail;

  const searchOptions = useMemo(() => buildSearchOptions(data), [data]);
  const stats = useMemo(() => getGraphStats(data), [data]);
  const [colorMode, setColorMode] = useState<ColorMode>("origin");
  const originCounts = useMemo(() => {
    const c: Record<DllOrigin, number> = { msil: 0, vendor: 0 };
    data?.dlls.forEach((d) => (c[getOrigin(d.name)] += 1));
    return c;
  }, [data]);

  const handleNodeClick = useCallback((nodeId: string | null) => {
    setSelectedNode(nodeId);
    if (nodeId && !isDesktop) setMobileSheetOpen(true);
    if (!nodeId) setMobileSheetOpen(false);
  }, [isDesktop]);

  const handleSearchSelect = useCallback((nodeId: string) => {
    setPage((p) => (p === "audit" ? "graph" : p));
    setSelectedNode(nodeId);
    if (!isDesktop) setMobileSheetOpen(true);
  }, [isDesktop]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Navbar
        page={page}
        onPageChange={setPage}
        currentSuite={selectedSuite}
        onSuiteChange={handleSuiteChange}
        options={searchOptions}
        onSelectNode={handleSearchSelect}
        stats={stats}
      />

      <Box sx={{ flex: 1, position: "relative", minHeight: 0 }}>
        {page === "graph" ? (
          <SplitLayout
            isDesktop={isDesktop}
            panel={
              isDesktop ? (
                <DetailPanel
                  data={data}
                  detail={nodeDetail}
                  isLoading={isDetailLoading}
                  onClear={() => setSelectedNode(null)}
                  onJumpToNode={handleNodeClick}
                />
              ) : null
            }
          >
            <Fade in key="graph" timeout={400}>
              <Box sx={{ position: "absolute", inset: 0 }}>
                <ThreeGraphCanvas
                  data={data}
                  selectedNodeId={selectedNode}
                  onNodeClick={handleNodeClick}
                  colorMode={colorMode}
                />
                <ColorLegend
                  originCounts={originCounts}
                  colorMode={colorMode}
                  onColorModeChange={setColorMode}
                />
                <Loader
                  open={isLoading}
                  message={`Loading ${selectedSuite}...`}
                  subMessage="Fetching dependency indices and generating 3D instances"
                />
              </Box>
            </Fade>
          </SplitLayout>
        ) : page === "table" ? (
          <SplitLayout
            isDesktop={isDesktop}
            panel={
              isDesktop ? (
                <DetailPanel
                  data={data}
                  detail={nodeDetail}
                  isLoading={isDetailLoading}
                  onClear={() => setSelectedNode(null)}
                  onJumpToNode={handleNodeClick}
                />
              ) : null
            }
          >
            <Fade in key="table" timeout={400}>
              <Box sx={{ position: "absolute", inset: 0 }}>
              <GraphTablePage
                data={data}
                isLoading={isLoading}
                selectedNodeId={selectedNode}
                onSelectNode={handleNodeClick}
              />
              </Box>
            </Fade>
          </SplitLayout>
        ) : (
          <Fade in key="audit" timeout={400}>
            <Box sx={{ position: "absolute", inset: 0 }}>
              <AuditPage />
            </Box>
          </Fade>
        )}
        {!isDesktop && selectedNode && page !== "audit" && !mobileSheetOpen && (
          <Button
            variant="contained"
            onClick={() => setMobileSheetOpen(true)}
            sx={{ position: "absolute", right: 16, bottom: 16, zIndex: 6 }}
          >
            Details
          </Button>
        )}
      </Box>

      {!isDesktop && page !== "audit" && (
        <DetailSheet
          open={mobileSheetOpen && !!selectedNode}
          onOpen={() => setMobileSheetOpen(true)}
          onClose={() => setMobileSheetOpen(false)}
          detail={nodeDetail}
          isLoading={isDetailLoading}
          onJumpToNode={handleNodeClick}
        />
      )}
    </Box>
  );
};

export default App;
