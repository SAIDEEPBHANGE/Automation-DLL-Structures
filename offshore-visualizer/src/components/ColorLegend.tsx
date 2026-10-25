import React from "react";
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ORIGIN_LABEL, originCss, type DllOrigin } from "../utils/dllClassifier";

export type ColorMode = "origin" | "default";

interface ColorLegendProps {
  originCounts: Record<DllOrigin, number>;
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

export const ColorLegend: React.FC<ColorLegendProps> = ({ originCounts, colorMode, onColorModeChange }) => (
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
      onChange={(_, value: ColorMode | null) => value && onColorModeChange(value)}
      aria-label="Colour mode"
      sx={{ mb: 1 }}
    >
      <ToggleButton value="origin">Origin</ToggleButton>
      <ToggleButton value="default">Default</ToggleButton>
    </ToggleButtonGroup>
    {colorMode === "origin" && (
      <Stack spacing={0.5}>
        {(["msil", "vendor"] as DllOrigin[]).map((origin) => (
          <Row
            key={origin}
            color={originCss(origin)}
            label={ORIGIN_LABEL[origin]}
            count={originCounts[origin]}
          />
        ))}
      </Stack>
    )}
  </Paper>
);
