import React from "react";

interface LoaderProps {
  message?: string;
  subMessage?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  message = "Loading Graph Topology...",
  subMessage = "Fetching assemblies and compiling WebGL buffers",
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(9, 13, 22, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        color: "#f8fafc",
        pointerEvents: "all",
      }}
    >
      <style>{`
        @keyframes offshore-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Modern Gradient Spinner */}
      <div
        style={{
          width: "56px",
          height: "56px",
          border: "4px solid #1e293b",
          borderTop: "4px solid #38bdf8",
          borderRadius: "50%",
          animation: "offshore-spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          boxShadow: "0 0 24px rgba(56, 189, 248, 0.25)",
        }}
      />

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <h3
          style={{
            margin: "0 0 6px 0",
            fontSize: "16px",
            fontWeight: 600,
            letterSpacing: "0.4px",
            color: "#f1f5f9",
          }}
        >
          {message}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#94a3b8",
          }}
        >
          {subMessage}
        </p>
      </div>
    </div>
  );
};
