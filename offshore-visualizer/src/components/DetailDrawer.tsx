import React, { useState } from "react";
import type { DllDetailPayload } from "../types/detail";

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  detail: DllDetailPayload | null;
  isLoading: boolean;
  onJumpToNode: (nodeId: string) => void;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  detail,
  isLoading,
  onJumpToNode,
}) => {
  const [activeTab, setActiveTab] = useState<"dependencies" | "types">(
    "dependencies",
  );
  const [typeSearch, setTypeSearch] = useState("");
  const [expandedTypeId, setExpandedTypeId] = useState<number | null>(null);

  if (!isOpen || !detail) return null;

  const typesList = detail.types ?? [];
  const dependenciesList = detail.dependencies ?? [];

  const filteredTypes = typesList.filter(
    (t) =>
      t.name?.toLowerCase().includes(typeSearch.toLowerCase()) ||
      t.namespace?.toLowerCase().includes(typeSearch.toLowerCase()),
  );

  return (
    <aside
      style={{
        position: "absolute",
        top: 60,
        right: 0,
        width: 440,
        height: "calc(100vh - 60px)",
        backgroundColor: "rgba(15, 23, 42, 0.96)",
        backdropFilter: "blur(12px)",
        borderLeft: "1px solid #334155",
        display: "flex",
        flexDirection: "column",
        zIndex: 90,
        boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.5)",
        color: "#f8fafc",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #334155",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#f59e0b",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              #{detail.id}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {detail.architecture || "MSIL / .NET"}
            </span>
            {detail.version && (
              <span
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  backgroundColor: "#1e293b",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                v{detail.version}
              </span>
            )}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              wordBreak: "break-word",
            }}
          >
            {detail.name}
          </h2>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
            lineHeight: 1,
          }}
          title="Close Drawer"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #334155",
          backgroundColor: "#0f172a",
        }}
      >
        <button
          onClick={() => setActiveTab("dependencies")}
          style={{
            flex: 1,
            padding: "10px 0",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "dependencies"
                ? "2px solid #38bdf8"
                : "2px solid transparent",
            color: activeTab === "dependencies" ? "#38bdf8" : "#94a3b8",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Connected Nodes ({dependenciesList.length})
        </button>
        <button
          onClick={() => setActiveTab("types")}
          style={{
            flex: 1,
            padding: "10px 0",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "types"
                ? "2px solid #38bdf8"
                : "2px solid transparent",
            color: activeTab === "types" ? "#38bdf8" : "#94a3b8",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Types / AST{" "}
          {isLoading
            ? "(loading...)"
            : `(${detail.totalTypes ?? typesList.length})`}
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {activeTab === "dependencies" && (
          <div>
            <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#94a3b8" }}>
              Click any connected assembly to focus the 3D camera:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dependenciesList.map((dep) => (
                <div
                  key={dep.id}
                  onClick={() => onJumpToNode(String(dep.id))}
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#1e293b",
                    borderRadius: 6,
                    border: "1px solid #334155",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#27354a")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "#1e293b")
                  }
                >
                  <span
                    style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}
                  >
                    {dep.name}
                  </span>
                  <span style={{ fontSize: 11, color: "#38bdf8" }}>
                    #{dep.id} →
                  </span>
                </div>
              ))}
              {dependenciesList.length === 0 && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                    fontStyle: "italic",
                    padding: 8,
                  }}
                >
                  No connected dependencies registered in the topology graph.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "types" && (
          <div>
            {isLoading ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                Loading classes and method signatures...
              </div>
            ) : typesList.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                No AST chunk file found for this assembly. Showing topology
                metrics only.
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Filter classes, interfaces..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #475569",
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 12,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {filteredTypes.map((typeItem) => {
                    const isExpanded = expandedTypeId === typeItem.id;
                    return (
                      <div
                        key={typeItem.id}
                        style={{
                          backgroundColor: "#1e293b",
                          borderRadius: 6,
                          border: "1px solid #334155",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() =>
                            setExpandedTypeId(isExpanded ? null : typeItem.id)
                          }
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: isExpanded
                              ? "#27354a"
                              : "transparent",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontSize: 11,
                                color:
                                  typeItem.kind === "Interface"
                                    ? "#a855f7"
                                    : "#38bdf8",
                                marginRight: 6,
                                fontWeight: 600,
                              }}
                            >
                              [{typeItem.kind}]
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {typeItem.name}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>

                        {isExpanded && (
                          <div
                            style={{
                              padding: "10px 12px",
                              backgroundColor: "#0f172a",
                              borderTop: "1px solid #334155",
                              fontSize: 12,
                            }}
                          >
                            <div style={{ color: "#94a3b8", marginBottom: 4 }}>
                              <strong>Namespace:</strong> {typeItem.namespace}
                            </div>
                            {typeItem.baseType && (
                              <div
                                style={{ color: "#94a3b8", marginBottom: 6 }}
                              >
                                <strong>Extends:</strong> {typeItem.baseType}
                              </div>
                            )}

                            {typeItem.members &&
                              typeItem.members.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "#cbd5e1",
                                      marginBottom: 4,
                                    }}
                                  >
                                    Members ({typeItem.members.length}):
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 4,
                                      maxHeight: 160,
                                      overflowY: "auto",
                                    }}
                                  >
                                    {typeItem.members.map((m, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          fontFamily: "monospace",
                                          fontSize: 11,
                                          color: "#94a3b8",
                                        }}
                                      >
                                        <span style={{ color: "#38bdf8" }}>
                                          {m.kind?.toLowerCase()}
                                        </span>{" "}
                                        <span style={{ color: "#f1f5f9" }}>
                                          {m.name}
                                        </span>
                                        {m.returnType && ` : ${m.returnType}`}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
