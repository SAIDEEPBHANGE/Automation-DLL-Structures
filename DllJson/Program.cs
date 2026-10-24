/*
  Author: Saideep Bhange
 */
using DllJson.Models;
using DllJson.Services;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
namespace DllJson
{
    public class Program
    {
        static void Main(string[] args)
        {
            var config = new FoldersJson();
            Console.WriteLine("Scanning configurations...");
            var run = new AuditRun
            {
                RunId = Guid.NewGuid(),
                StartedAt = DateTime.UtcNow,
                TargetFramework = ".NET Framework 4.8",
                Machine = Environment.MachineName,
                ProcessId = Process.GetCurrentProcess().Id,
                Config = new AuditConfig
                {
                    SolutionPath = Directory.GetCurrentDirectory(),
                    AuditFolder = "D:\\Github Repository\\Off-Shore\\Backend-Audits\\data",
                    IncludePatterns = new List<string> { "*.dll" }
                }
            };
            // Shared minified JSON configuration
            var minifiedOptions = new JsonSerializerOptions
            {
                WriteIndented = false,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };

            foreach (var folderConfig in config.Configurations)
            {
                var folderAudit = new FolderAudit
                {
                    FolderName = Path.GetFileName(folderConfig.OutputPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)),
                    FolderPath = folderConfig.FolderPath,
                    StartedAt = DateTime.UtcNow
                };

                try
                {
                    Directory.CreateDirectory(folderConfig.OutputPath);
                    Console.WriteLine($"Processing: {folderConfig.JsonFileName}");

                    var scanner = new AssemblyScanner();
                    var scanResult = scanner.Scan(folderConfig);
                    var graph = scanResult.Graph;

                    folderAudit.DllCount = graph.Dlls.Count + (scanResult.Skipped?.Count ?? 0) + (scanResult.NativeDlls?.Count ?? 0);

                    // 1. Parallelize individual DLL detail file writing
                    var dllFolder = Path.Combine(folderConfig.OutputPath, "Dlls");
                    Directory.CreateDirectory(dllFolder);

                    var syncLock = new object();

                    Parallel.ForEach(graph.Dlls, dll =>
                    {
                        var dllAudit = new DllAudit
                        {
                            DllName = dll.DllName,
                            DllPath = dll.FilePath,
                            StartedAt = DateTime.UtcNow
                        };

                        try
                        {
                            // Name files deterministically by their numeric ID or sanitized name
                            var dllFileName = $"{dll.Id}_{MakeSafeFileName(dll.DllName)}.json";
                            var dllPath = Path.Combine(dllFolder, dllFileName);

                            var dllJson = JsonSerializer.Serialize(dll, minifiedOptions);
                            File.WriteAllText(dllPath, dllJson);

                            dllAudit.EndedAt = DateTime.UtcNow;
                            dllAudit.DurationMs = (long)(dllAudit.EndedAt.Value - dllAudit.StartedAt).TotalMilliseconds;
                            dllAudit.Status = "Processed";
                            dllAudit.Result = "Success";
                            dllAudit.ProcessedTypesCount = (dll.Classes?.Count ?? 0)
                                                         + (dll.Interfaces?.Count ?? 0)
                                                         + (dll.Structs?.Count ?? 0)
                                                         + (dll.Enums?.Count ?? 0)
                                                         + (dll.Delegates?.Count ?? 0);

                            lock (syncLock)
                            {
                                folderAudit.Counts.Processed++;
                                folderAudit.Dlls.Add(dllAudit);
                            }
                        }
                        catch (Exception exDll)
                        {
                            dllAudit.EndedAt = DateTime.UtcNow;
                            dllAudit.DurationMs = (long)(dllAudit.EndedAt.Value - dllAudit.StartedAt).TotalMilliseconds;
                            dllAudit.Status = "Failed";
                            dllAudit.Result = "Exception";
                            dllAudit.Reason = exDll.Message;
                            dllAudit.Exception = new ExceptionInfo
                            {
                                Type = exDll.GetType().FullName,
                                Message = exDll.Message,
                                StackTrace = exDll.StackTrace
                            };

                            lock (syncLock)
                            {
                                folderAudit.Counts.Failed++;
                                folderAudit.Dlls.Add(dllAudit);
                            }
                        }
                    });

                    // 2. Export Master Graph (Topology Only)
                    // Flattened nodes with short keys: i = Id, n = Name, d = DllId, k = Kind
                    var typeNodes = new List<object>();

                    foreach (var dll in graph.Dlls)
                    {
                        if (dll.Classes != null)
                        {
                            foreach (var c in dll.Classes)
                                typeNodes.Add(new { i = c.Id, n = c.Name, fn = c.FullName, d = dll.Id, k = "Class" });
                        }
                        if (dll.Interfaces != null)
                        {
                            foreach (var i in dll.Interfaces)
                                typeNodes.Add(new { i = i.Id, n = i.Name, fn = i.FullName, d = dll.Id, k = "Interface" });
                        }
                        if (dll.Structs != null)
                        {
                            foreach (var s in dll.Structs)
                                typeNodes.Add(new { i = s.Id, n = s.Name, fn = s.FullName, d = dll.Id, k = "Struct" });
                        }
                    }

                    var masterGraphPayload = new
                    {
                        version = 1,
                        generatedAt = DateTime.UtcNow,
                        stats = new
                        {
                            dllCount = graph.Dlls.Count,
                            typeNodeCount = typeNodes.Count,
                            dllRefCount = graph.References?.Count ?? 0,
                            typeRefCount = graph.TypeReferences?.Count ?? 0
                        },
                        dlls = graph.Dlls.Select(d => new
                        {
                            id = d.Id,
                            name = d.DllName,
                            version = d.Version,
                            detailFile = $"{d.Id}_{MakeSafeFileName(d.DllName)}.json"
                        }),
                        nodes = typeNodes,
                        dllEdges = graph.References?.Select(r => new { s = r.SourceDllId, t = r.TargetDllId }),
                        typeEdges = graph.TypeReferences?.Select(r => new
                        {
                            s = r.SourceTypeId,
                            t = r.TargetTypeId,
                            sd = r.SourceDllId,
                            td = r.TargetDllId,
                            k = r.ReferenceKind
                        })
                    };

                    var masterGraphPath = Path.Combine(folderConfig.OutputPath, folderConfig.JsonFileName);
                    var masterGraphJson = JsonSerializer.Serialize(masterGraphPayload, minifiedOptions);
                    File.WriteAllText(masterGraphPath, masterGraphJson);

                    folderAudit.EndedAt = DateTime.UtcNow;
                    folderAudit.DurationMs = (long)(folderAudit.EndedAt.Value - folderAudit.StartedAt).TotalMilliseconds;

                    Console.WriteLine($"Master Graph Saved: {masterGraphPath}");
                    Console.WriteLine($"Total Types Indexed: {typeNodes.Count}");
                    Console.WriteLine($"Total Type Edges: {graph.TypeReferences?.Count ?? 0}");
                }
                catch (Exception ex)
                {
                    folderAudit.EndedAt = DateTime.UtcNow;
                    folderAudit.DurationMs = (long)(folderAudit.EndedAt.Value - folderAudit.StartedAt).TotalMilliseconds;
                    folderAudit.Counts.Failed = folderAudit.DllCount;
                    Console.WriteLine($"ERROR: {ex.Message}");
                    folderAudit.Warnings.Add(ex.Message);
                }
                finally
                {
                    run.Folders.Add(folderAudit);
                }
            }
            run.EndedAt = DateTime.UtcNow;
            run.TotalDurationMs = (long)(run.EndedAt.Value - run.StartedAt).TotalMilliseconds;
            run.Summary.FoldersScanned = run.Folders.Count;
            run.Summary.TotalDlls = run.Folders.Sum(f => f.DllCount);
            run.Summary.Processed = run.Folders.Sum(f => f.Counts.Processed);
            run.Summary.Failed = run.Folders.Sum(f => f.Counts.Failed);
            run.Summary.PartiallyProcessed = run.Folders.Sum(f => f.Counts.PartiallyProcessed);
            run.Summary.Skipped = run.Folders.Sum(f => f.Counts.Skipped);
            run.Summary.NativeFound = run.Folders.Sum(f => f.Counts.Native);
            var auditFolder = run.Config.AuditFolder;
            var writer = new AuditWriter(run, auditFolder);
            writer.Write();
            Console.WriteLine("ALL DONE");
        }
        private static string MakeSafeFileName(
            string fileName)
        {
            foreach (var invalidChar in Path.GetInvalidFileNameChars())
            {
                fileName =
                    fileName.Replace(
                        invalidChar,
                        '_');
            }
            return fileName;
        }
    }
}