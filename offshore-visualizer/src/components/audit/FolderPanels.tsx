import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { AuditFolder } from "../../types/audit";
import { formatDate, formatDuration } from "../../utils/auditUtils";

export const FolderPanels: React.FC<{ folders: AuditFolder[] }> = ({ folders }) => (
  <Stack spacing={1}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
      Folders
    </Typography>
    {folders.map((f) => {
      const pct = f.DllCount > 0 ? (f.Counts.Processed / f.DllCount) * 100 : 0;
      return (
        <Accordion key={f.FolderName} disableGutters variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack sx={{ width: "100%", pr: 2 }} spacing={0.75}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 600 }}>{f.FolderName}</Typography>
                <Chip size="small" label={`${f.DllCount.toLocaleString()} DLLs`} />
                <Chip size="small" color="success" variant="outlined" label={`${f.Counts.Processed} ok`} />
                {f.Counts.Failed > 0 && <Chip size="small" color="error" label={`${f.Counts.Failed} failed`} />}
                {f.Counts.Skipped > 0 && <Chip size="small" label={`${f.Counts.Skipped} skipped`} />}
              </Stack>
              <LinearProgress variant="determinate" value={pct} color="success" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
              {f.FolderPath}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              {formatDate(f.StartedAt)} → {formatDate(f.EndedAt)} · {formatDuration(f.DurationMs)} · native{" "}
              {f.Counts.Native} · partial {f.Counts.PartiallyProcessed}
            </Typography>
            {(f.Warnings ?? []).map((w) => (
              <Typography key={w} variant="caption" color="warning.main" component="div">
                {w}
              </Typography>
            ))}
          </AccordionDetails>
        </Accordion>
      );
    })}
  </Stack>
);
