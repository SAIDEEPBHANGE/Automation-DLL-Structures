import React, { useEffect, useState, useCallback, useMemo } from "react";
import type { MasterGraphPayload } from "./types/graph";
import { ThreeGraphCanvas } from "./components/ThreeGraphCanvas";
import { Navbar, type SearchOption } from "./components/Navbar";
import { Loader } from "./components/Loader";

export const App: React.FC = () => {
  const [data, setData] = useState<MasterGraphPayload | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<
    "SmartPlant3D" | "SmartPlantPID"
  >("SmartPlant3D");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleSuiteChange = useCallback(
    (suite: "SmartPlant3D" | "SmartPlantPID") => {
      setSelectedNode(null);
      setSelectedSuite(suite);
    },
    [],
  );

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
          console.error("Failed to load topology:", err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSuite]);

  // Extract search options directly from payload
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
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
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

      {/* WebGL Canvas */}
      <ThreeGraphCanvas
        data={data}
        selectedNodeId={selectedNode}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
};

export default App;
