/*
  Author: Saideep Bhange
 */
using DllJson.Models;
using DllJson.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Diagnostics;
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
                    Directory.CreateDirectory(
                        folderConfig.OutputPath);
                    Console.WriteLine(
                        $"Processing: {folderConfig.JsonFileName}");
                    var scanner = new AssemblyScanner();
                    var scanResult = scanner.Scan(folderConfig);
                    var graph = scanResult.Graph;
                    // Update counts
                    folderAudit.DllCount = graph.Dlls.Count + (scanResult.Skipped?.Count ?? 0) + (scanResult.NativeDlls?.Count ?? 0);
                    //
                    // Create Dlls folder
                    //
                    var dllFolder = Path.Combine(
                        folderConfig.OutputPath,
                        "Dlls");
                    Directory.CreateDirectory(dllFolder);
                    //
                    // Save one file per DLL
                    //
                    foreach (var dll in graph.Dlls)
                    {
                        var dllAudit = new DllAudit
                        {
                            DllName = dll.DllName,
                            DllPath = dll.FilePath,
                            StartedAt = DateTime.UtcNow
                        };
                        try
                        {
                            var dllFileName =
                                MakeSafeFileName(dll.DllName) + ".json";
                            var dllPath = Path.Combine(
                                dllFolder,
                                dllFileName);
                            var dllJson = JsonSerializer.Serialize(
                                dll,
                                new JsonSerializerOptions
                                {
                                    WriteIndented = true
                                });
                            File.WriteAllText(
                                dllPath,
                                dllJson);
                            dllAudit.EndedAt = DateTime.UtcNow;
                            dllAudit.DurationMs = (long)(dllAudit.EndedAt.Value - dllAudit.StartedAt).TotalMilliseconds;
                            dllAudit.Status = "Processed";
                            dllAudit.Result = "Success";
                            // compute processed types from available collections in DllInfo
                            dllAudit.ProcessedTypesCount = (dll.Classes?.Count ?? 0)
                                                           + (dll.Interfaces?.Count ?? 0)
                                                           + (dll.Structs?.Count ?? 0)
                                                           + (dll.Enums?.Count ?? 0)
                                                           + (dll.Delegates?.Count ?? 0);
                            folderAudit.Counts.Processed++;
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
                            folderAudit.Counts.Failed++;
                            Console.WriteLine($"DLL ERROR: {exDll.Message}");
                        }
                        folderAudit.Dlls.Add(dllAudit);
                    }
                    // record native DLLs with extracted metadata
                    if (scanResult.NativeDlls != null && scanResult.NativeDlls.Count > 0)
                    {
                        foreach (var nativeInfo in scanResult.NativeDlls)
                        {
                            var nativeAudit = new NativeDllAudit
                            {
                                DllName = nativeInfo.FileName,
                                DllPath = nativeInfo.FilePath,
                                FileSizeBytes = nativeInfo.FileSizeBytes,
                                CreatedDate = nativeInfo.CreatedDate,
                                ModifiedDate = nativeInfo.ModifiedDate,
                                FileVersion = nativeInfo.FileVersion,
                                ProductVersion = nativeInfo.ProductVersion,
                                ProductName = nativeInfo.ProductName,
                                CompanyName = nativeInfo.CompanyName,
                                FileDescription = nativeInfo.FileDescription,
                                Architecture = nativeInfo.Architecture,
                                TimeDateStamp = nativeInfo.TimeDateStamp,
                                Subsystem = nativeInfo.Subsystem,
                                OperatingSystemVersion = nativeInfo.OperatingSystemVersion,
                                ExtractionError = nativeInfo.ExtractionError
                            };
                            folderAudit.NativeDlls.Add(nativeAudit);
                            folderAudit.Counts.Native++;
                        }
                    }
                    // record other skipped/failed assemblies from scanner (non-native)
                    if (scanResult.Skipped != null && scanResult.Skipped.Count > 0)
                    {
                        foreach (var skip in scanResult.Skipped)
                        {
                            // Skip native DLLs - already handled above
                            if (skip.SkipCategory == "Native")
                                continue;
                            var dllAudit = new DllAudit
                            {
                                DllName = Path.GetFileName(skip.FilePath),
                                DllPath = skip.FilePath,
                                StartedAt = DateTime.UtcNow,
                                EndedAt = DateTime.UtcNow,
                                DurationMs = 0,
                                Status = "Failed",
                                Result = skip.SkipCategory,
                                Reason = skip.Reason,
                                Exception = skip.Exception
                            };
                            folderAudit.Dlls.Add(dllAudit);
                            folderAudit.Counts.Failed++;
                        }
                    }
                    //
                    // Build lightweight graph
                    //
                    var lightGraph = new AssemblyGraph
                    {
                        References = graph.References,
                        TypeReferences = graph.TypeReferences,
                        Dlls = graph.Dlls
                            .Select(d => new DllInfo
                            {
                                Id = d.Id,
                                DllName = d.DllName,
                                Version = d.Version,
                                FilePath = d.FilePath,
                                Metadata = d.Metadata,
                                Dependencies = d.Dependencies
                            })
                            .ToList()
                    };
                    //
                    // Save master graph
                    //
                    var graphPath = Path.Combine(
                        folderConfig.OutputPath,
                        folderConfig.JsonFileName);
                    var graphJson = JsonSerializer.Serialize(
                        lightGraph,
                        new JsonSerializerOptions
                        {
                            WriteIndented = true
                        });
                    File.WriteAllText(
                        graphPath,
                        graphJson);
                    folderAudit.EndedAt = DateTime.UtcNow;
                    folderAudit.DurationMs = (long)(folderAudit.EndedAt.Value - folderAudit.StartedAt).TotalMilliseconds;
                    Console.WriteLine(
                        $"Master Graph Saved: {graphPath}");
                    Console.WriteLine(
                        $"DLL Count: {graph.Dlls.Count}");
                    Console.WriteLine(
                        $"Reference Count: {graph.References.Count}");
                    Console.WriteLine(
                        $"DLL Files Saved: {graph.Dlls.Count}");
                }
                catch (Exception ex)
                {
                    folderAudit.EndedAt = DateTime.UtcNow;
                    folderAudit.DurationMs = (long)(folderAudit.EndedAt.Value - folderAudit.StartedAt).TotalMilliseconds;
                    folderAudit.Counts.Failed = folderAudit.DllCount; // mark all as failed for this folder
                    Console.WriteLine(
                        $"ERROR: {ex.Message}");
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