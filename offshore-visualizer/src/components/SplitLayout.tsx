import React from "react";
import { Box } from "@mui/material";
import { NAV_HEIGHT, PANEL_WIDTH_PERCENT } from "../theme";

interface SplitLayoutProps {
  panel?: React.ReactNode;
  isDesktop: boolean;
  children: React.ReactNode;
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({ panel, isDesktop, children }) => (
  <Box
    sx={{
      display: "flex",
      height: `calc(100vh - ${NAV_HEIGHT}px)`,
      minHeight: 0,
      overflow: "hidden",
    }}
  >
    {isDesktop && (
      <Box
        sx={{
          flex: `0 1 ${PANEL_WIDTH_PERCENT}%`,
          minWidth: 340,
          maxWidth: 560,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        {panel}
      </Box>
    )}
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative" }}>
      {children}
    </Box>
  </Box>
);
