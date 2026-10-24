import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { MasterGraphPayload } from './types/graph';
import type { DllDetailPayload } from './types/detail';
import { ThreeGraphCanvas } from './components/ThreeGraphCanvas';
import { Navbar, type SearchOption } from './components/Navbar';
import { Loader } from './components/Loader';
import { DetailDrawer } from './components/DetailDrawer';

export const App: React.FC = () => {
  const [data, setData] = useState<MasterGraphPayload | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<'SmartPlant3D' | 'SmartPlantPID'>('SmartPlant3D');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [nodeDetail, setNodeDetail] = useState<DllDetailPayload | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  const handleSuiteChange = useCallback((suite: 'SmartPlant3D' | 'SmartPlantPID') => {
    setSelectedNode(null);
    setIsDrawerOpen(false);
    setNodeDetail(null);
    setSelectedSuite(suite);
  }, []);

  // Fetch Master Topology
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    fetch(`/data/${selectedSuite}/${selectedSuite}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((payload: MasterGraphPayload) => {
        if (!isCancelled) {
          setData(payload);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Failed to load topology:', err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSuite]);

  // Lazy-load per-DLL AST details when selectedNode changes
  // Immediate Display + Background AST Chunk Fetch
  useEffect(() => {
    if (!selectedNode || !data) {
      setNodeDetail(null);
      setIsDrawerOpen(false);
      setIsDetailLoading(false);
      return;
    }

    const targetId = parseInt(selectedNode, 10);
    const dllMeta = data.dlls.find((d) => d.id === targetId);

    if (!dllMeta) return;

    // 1. Calculate connected edges directly from in-memory master graph
    const outboundDeps: Array<{ id: number; name: string }> = [];
    const inboundDeps: Array<{ id: number; name: string }> = [];

    data.dllEdges.forEach((edge) => {
      if (edge.s === targetId) {
        const dest = data.dlls.find((d) => d.id === edge.t);
        outboundDeps.push({
          id: edge.t,
          name: dest ? dest.name : `DLL #${edge.t}`,
        });
      } else if (edge.t === targetId) {
        const src = data.dlls.find((d) => d.id === edge.s);
        inboundDeps.push({
          id: edge.s,
          name: src ? src.name : `DLL #${edge.s}`,
        });
      }
    });

    const isVendor =
      dllMeta.name.startsWith('Microsoft.') ||
      dllMeta.name.startsWith('Telerik.') ||
      dllMeta.name.startsWith('CefSharp.') ||
      dllMeta.name.startsWith('Xceed.');

    // 2. Set instant state so the drawer opens immediately without blocking on network
    const initialDetail: DllDetailPayload = {
      id: dllMeta.id,
      name: dllMeta.name,
      version: dllMeta.version || '1.0.0.0',
      architecture: isVendor ? 'Vendor / Runtime' : 'MSIL / .NET',
      totalTypes: 0,
      dependencies: outboundDeps,
      types: [],
    };

    setNodeDetail(initialDetail);
    setIsDrawerOpen(true);
    setIsDetailLoading(true);

    // 3. Resolve the detail file path
    // Handles both flat filenames ("1000_Planning.json") and paths already starting with "Dlls/"
    let chunkPath = dllMeta.detailFile || `${dllMeta.id}_${dllMeta.name}.json`;
    if (!chunkPath.startsWith('Dlls/') && !chunkPath.startsWith('/')) {
      chunkPath = `Dlls/${chunkPath}`;
    }

    const detailUrl = `/data/${selectedSuite}/${chunkPath}`;
    let isSubscribed = true;

    fetch(detailUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload: Partial<DllDetailPayload>) => {
        if (!isSubscribed) return;

        setNodeDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            version: payload.version || prev.version,
            architecture: payload.architecture || prev.architecture,
            totalTypes: payload.totalTypes || payload.types?.length || 0,
            dependencies: payload.dependencies && payload.dependencies.length > 0
              ? payload.dependencies
              : prev.dependencies,
            types: payload.types || [],
          };
        });
        setIsDetailLoading(false);
      })
      .catch(() => {
        // Silent recovery: Master metadata is already visible
        if (isSubscribed) {
          setIsDetailLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedNode, data, selectedSuite]);

  // Search options
  const searchOptions = useMemo<SearchOption[]>(() => {
    if (!data) return [];
    return data.dlls.map((dll) => ({
      id: String(dll.id),
      label: `${dll.name} (#${dll.id})`,
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return undefined;
    return {
      nodesCount: data.dlls.length,
      edgesCount: data.dllEdges.length,
    };
  }, [data]);

  const handleNodeClick = useCallback((nodeId: string | null) => {
    setSelectedNode(nodeId);
    if (!nodeId) {
      setIsDrawerOpen(false);
    }
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedNode(null);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <Loader
          message={`Loading ${selectedSuite}...`}
          subMessage="Fetching dependency indices and generating 3D instances"
        />
      )}

      {/* Navbar Header */}
      <Navbar
        currentSuite={selectedSuite}
        onSuiteChange={handleSuiteChange}
        options={searchOptions}
        onSelectNode={handleNodeClick}
        stats={stats}
      />

      {/* Three.js 3D WebGL Canvas */}
      <ThreeGraphCanvas
        data={data}
        selectedNodeId={selectedNode}
        onNodeClick={handleNodeClick}
      />

      {/* Right Slide-out Detail Drawer */}
      <DetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        detail={nodeDetail}
        isLoading={isDetailLoading}
        onJumpToNode={handleNodeClick}
      />
    </div>
  );
};

export default App;