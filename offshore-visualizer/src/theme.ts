import { createTheme } from "@mui/material/styles";

export const NAV_HEIGHT = 64;

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#38bdf8" },
    secondary: { main: "#f59e0b" },
    background: { default: "#090d16", paper: "#0f172a" },
    divider: "#334155",
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: '"Segoe UI", system-ui, Roboto, sans-serif' },
});
