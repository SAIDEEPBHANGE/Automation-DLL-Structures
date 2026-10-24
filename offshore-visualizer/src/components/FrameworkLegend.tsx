import React from "react";
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  FRAMEWORK_LABEL,
  FRAMEWORK_ORDER,
  frameworkCss,
  type FrameworkFamily,
} from "../utils/frameworkUtils";

interface FrameworkLegendProps {
  counts: Record<FrameworkFamily, number>;
  colorMode: "framework" | "default";
  onColorModeChange: (mode: "framework" | "default") => void;
}

export const FrameworkLegend: React.FC<FrameworkLegendProps> = ({ counts, colorMode, onColorModeChange }) => (
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
      maxWidth: 220,
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
      <ToggleButton value="framework">Framework</ToggleButton>
      <ToggleButton value="default">Default</ToggleButton>
    </ToggleButtonGroup>
    {colorMode === "framework" && (
      <Stack spacing={0.5}>
        {FRAMEWORK_ORDER.filter((f) => counts[f] > 0).map((f) => (
          <Stack key={f} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: frameworkCss(f), flexShrink: 0 }} />
            <Typography variant="caption" sx={{ flex: 1 }}>
              {FRAMEWORK_LABEL[f]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {counts[f].toLocaleString()}
            </Typography>
          </Stack>
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
          Dimmer shade = vendor / runtime
        </Typography>
      </Stack>
    )}
  </Paper>
);
