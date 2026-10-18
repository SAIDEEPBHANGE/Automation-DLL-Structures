using DllJson.Models;
using System;
using System.IO;
using System.Text.Json;
namespace DllJson.Services
{
    public class AuditWriter
    {
        private readonly AuditRun _run;
        private readonly string _auditFolder;
        public AuditWriter(AuditRun run, string auditFolder)
        {
            _run = run ?? throw new ArgumentNullException(nameof(run));
            _auditFolder = auditFolder;
        }
        public void EnsureFolder()
        {
            if (!Directory.Exists(_auditFolder))
            {
                Directory.CreateDirectory(_auditFolder);
            }
        }
        public void Write()
        {
            EnsureFolder();
            _run.GeneratedAt = DateTime.UtcNow;
            if (_run.EndedAt.HasValue)
            {
                _run.TotalDurationMs = (long)(_run.EndedAt.Value - _run.StartedAt).TotalMilliseconds;
            }
            var fileName = $"audit_{_run.StartedAt.ToString("yyyyMMdd_HHmmss")}.json";
            var tempPath = Path.Combine(_auditFolder, fileName + ".tmp");
            var finalPath = Path.Combine(_auditFolder, fileName);
            var opts = new JsonSerializerOptions { WriteIndented = true };
            var json = JsonSerializer.Serialize(_run, opts);
            File.WriteAllText(tempPath, json);
            if (File.Exists(finalPath)) File.Delete(finalPath);
            File.Move(tempPath, finalPath);
            // Update API index: api/latest-audit.json
            try
            {
                var apiFolder = Path.Combine(_auditFolder, "api");
                if (!Directory.Exists(apiFolder)) Directory.CreateDirectory(apiFolder);
                var latestPath = Path.Combine(apiFolder, "latest-audit.json");
                // Friendly display name: use UTC started time and short run id
                var displayName = $"{_run.StartedAt.ToString("yyyy-MM-dd HH:mm:ss") } (Run { _run.RunId.ToString().Substring(0, 8) })";
                var entry = new[]
                {
                    new {
                        FileName = fileName,
                        DisplayName = displayName
                    }
                };
                var indexJson = JsonSerializer.Serialize(entry, opts);
                // overwrite
                File.WriteAllText(latestPath, indexJson);
            }
            catch
            {
                // do not throw on index update failure
            }
        }
    }
}
