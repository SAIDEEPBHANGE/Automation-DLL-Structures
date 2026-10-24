import React from "react";
import { Alert, Box, Card, CardContent, Chip, Grow, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import type { AuditPayload } from "../../types/audit";
import {
  buildStatusDistribution,
  formatDate,
  formatDuration,
  type StatusColor,
} from "../../utils/auditUtils";
import { useCountUp } from "../../utils/motion";

const KPI_COLORS: Record<StatusColor, string> = {
  success: "success.main",
  error: "error.main",
  warning: "warning.main",
  info: "info.main",
  default: "text.secondary",
};

const KpiCard: React.FC<{ label: string; value: number; color: StatusColor; delay: number }> = ({
  label,
  value,
  color,
  delay,
}) => {
  const shown = useCountUp(value);
  return (
    <Grow in timeout={400 + delay}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" sx={{ color: KPI_COLORS[color], fontWeight: 700 }}>
            {shown.toLocaleString()}
          </Typography>
        </CardContent>
      </Card>
    </Grow>
  );
};

const RunInfo: React.FC<{ label: string; value?: string | number }> = ({ label, value }) =>
  value === undefined || value === "" ? null : (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
        {value}
      </Typography>
    </Box>
  );

export const AuditSummaryCards: React.FC<{ audit: AuditPayload }> = ({ audit }) => {
  const s = audit.Summary;
  const slices = buildStatusDistribution(s);
  const total = slices.reduce((n, x) => n + x.value, 0) || 1;

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1.5, alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Run {audit.RunId.slice(0, 8)}
            </Typography>
            {audit.TargetFramework && <Chip size="small" label={audit.TargetFramework} />}
            {s.Warnings.length > 0 && <Chip size="small" color="warning" label={`${s.Warnings.length} warnings`} />}
          </Stack>
          {s.Warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {s.Warnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </Alert>
          )}
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            }}
          >
            <RunInfo label="Started" value={formatDate(audit.StartedAt)} />
            <RunInfo label="Ended" value={formatDate(audit.EndedAt)} />
            <RunInfo label="Duration" value={formatDuration(audit.TotalDurationMs)} />
            <RunInfo label="Machine / PID" value={`${audit.Machine ?? "-"} / ${audit.ProcessId ?? "-"}`} />
            <RunInfo label="Solution path" value={audit.Config?.SolutionPath} />
            <RunInfo label="Audit folder" value={audit.Config?.AuditFolder} />
            <RunInfo label="Include patterns" value={audit.Config?.IncludePatterns?.join(", ")} />
            <RunInfo label="Generated" value={formatDate(audit.GeneratedAt)} />
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(7, 1fr)" },
        }}
      >
        <KpiCard label="Folders scanned" value={s.FoldersScanned} color="default" delay={0} />
        <KpiCard label="Total DLLs" value={s.TotalDlls} color="info" delay={50} />
        <KpiCard label="Processed" value={s.Processed} color="success" delay={100} />
        <KpiCard label="Partial" value={s.PartiallyProcessed} color="warning" delay={150} />
        <KpiCard label="Failed" value={s.Failed} color="error" delay={200} />
        <KpiCard label="Skipped" value={s.Skipped} color="default" delay={250} />
        <KpiCard label="Native" value={s.NativeFound} color="info" delay={300} />
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Status distribution
          </Typography>
          <Box sx={{ display: "flex", height: 14, borderRadius: 1, overflow: "hidden", bgcolor: "action.hover" }}>
            {slices
              .filter((x) => x.value > 0)
              .map((x) => (
                <Tooltip key={x.label} title={`${x.label}: ${x.value.toLocaleString()}`}>
                  <Box
                    sx={{
                      width: `${(x.value / total) * 100}%`,
                      bgcolor: KPI_COLORS[x.color],
                      transition: "width 0.8s ease",
                    }}
                  />
                </Tooltip>
              ))}
          </Box>
          <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
            {slices.map((x) => (
              <Stack key={x.label} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: KPI_COLORS[x.color] }} />
                <Typography variant="caption">
                  {x.label} ({x.value.toLocaleString()})
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export const SlowestBars: React.FC<{ items: Array<{ name: string; ms: number }> }> = ({ items }) => {
  const max = Math.max(1, ...items.map((i) => i.ms));
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Slowest DLLs
        </Typography>
        <Stack spacing={1}>
          {items.map((i) => (
            <Box key={i.name}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" noWrap sx={{ maxWidth: "70%" }}>
                  {i.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDuration(i.ms)}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={(i.ms / max) * 100} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
