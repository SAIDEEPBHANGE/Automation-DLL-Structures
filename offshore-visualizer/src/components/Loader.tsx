import React from "react";
import { Backdrop, CircularProgress, Fade, Stack, Typography } from "@mui/material";

interface LoaderProps {
  open?: boolean;
  message?: string;
  subMessage?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  open = true,
  message = "Loading Graph Topology...",
  subMessage = "Fetching assemblies and compiling WebGL buffers",
}) => (
  <Backdrop
    open={open}
    transitionDuration={250}
    sx={{ zIndex: (t) => t.zIndex.modal, backgroundColor: "rgba(9, 13, 22, 0.85)", position: "absolute" }}
  >
    <Fade in={open}>
      <Stack spacing={2} sx={{ px: 2, textAlign: "center", alignItems: "center" }}>
        <CircularProgress color="primary" />
        <Typography variant="h6">{message}</Typography>
        <Typography variant="body2" color="text.secondary">
          {subMessage}
        </Typography>
      </Stack>
    </Fade>
  </Backdrop>
);
