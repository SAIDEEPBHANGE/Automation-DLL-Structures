import React from "react";
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  FRAMEWORK_LABEL,
  FRAMEWORK_ORDER,
  frameworkCss,
  type FrameworkFamily,
} from "../utils/frameworkUtils";
import { ORIGIN_LABEL, originCss, type DllOrigin } from "../utils/dllClassifier";

export type ColorMode = "origin" | "framework" | "default";

interface ColorLegendProps {
  originCounts: Record<DllOrigin, number>;
  frameworkCounts: Record<FrameworkFamily, number>;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

const Row: React.FC<{ color: string; label: string; count: number }> = ({ color, label, count }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
    <Typography variant="caption" sx={{ flex: 1 }}>
      {label}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {count.toLocaleString()}
    </Typography>
  </Stack>
);

export const FrameworkLegend: React.FC<ColorLegendProps> = ({
  originCounts,
  frameworkCounts,
  colorMode,
  onColorModeChange,
}) => {
  const hasFramework = FRAMEWORK_ORDER.some((f) => f !== "unknown" && frameworkCounts[f] > 0);
  return (
    <Paper
      variant="outlined"
      sx={{
        position: "absolute",
        left: { xs: 8, sm: 16 },
        bottom: { xs: 8, sm: 16 },
        p: 1.25,
        bgcolor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 5,
        width: 230,
        maxWidth: "calc(100% - 16px)",
      }}
    >
      <ToggleButtonGroup
        exclusive
        size="small"
        fullWidth
        value={colorMode}
        onChange={(_, v) => v && onColorModeChange(v)}
        aria-label="Colour mode"
        sx={{ mb: 1 }}
      >
        <ToggleButton value="origin">Origin</ToggleButton>
        <ToggleButton value="framework" disabled={!hasFramework}>
          Framework
        </ToggleButton>
        <ToggleButton value="default">Default</ToggleButton>
      </ToggleButtonGroup>
      {colorMode === "origin" && (
        <Stack spacing={0.5}>
          {(["msil", "vendor"] as DllOrigin[]).map((o) => (
            <Row key={o} color={originCss(o)} label={ORIGIN_LABEL[o]} count={originCounts[o]} />
          ))}
        </Stack>
      )}
      {colorMode === "framework" && (
        <Stack spacing={0.5}>
          {FRAMEWORK_ORDER.filter((f) => frameworkCounts[f] > 0).map((f) => (
            <Row key={f} color={frameworkCss(f)} label={FRAMEWORK_LABEL[f]} count={frameworkCounts[f]} />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
            Dimmer shade = vendor / runtime
          </Typography>
        </Stack>
      )}
    </Paper>
  );
};
