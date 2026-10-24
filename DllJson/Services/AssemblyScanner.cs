using DllJson.Models;
using Mono.Cecil;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
namespace DllJson.Services
{
    public class AssemblyScanner
    {
        private readonly TypeExtractor _typeExtractor;
        private readonly ReferenceBuilder _referenceBuilder;
        private readonly NativeDllAnalyzer _nativeAnalyzer;
        public AssemblyScanner()
        {
            _typeExtractor = new TypeExtractor();
            _referenceBuilder = new ReferenceBuilder();
            _nativeAnalyzer = new NativeDllAnalyzer();
        }
        private DllInfo CreateDllInfo(AssemblyDefinition assembly, string filePath, int numericId)
        {
            var dllInfo = new DllInfo
            {
                Id = numericId,
                DllName = assembly.Name.Name,
                Version = assembly.Name.Version?.ToString(),
                FilePath = filePath,
                Metadata = new Metadata
                {
                    AssemblyName = assembly.Name.Name,
                    RuntimeVersion = assembly.MainModule.RuntimeVersion,
                    ScanDate = DateTime.UtcNow
                }
            };

            foreach (var reference in assembly.MainModule.AssemblyReferences)
            {
                dllInfo.Dependencies.Add(new Dependencies
                {
                    AssemblyName = reference.Name,
                    Version = reference.Version?.ToString()
                });
            }

            return dllInfo;
        }
        public ScanResult Scan(FolderJson config)
        {
            // Inside AssemblyScanner.Scan()

            var graph = new AssemblyGraph();
            var loadResult = LoadAssemblies(config.FolderPath);
            var assemblies = loadResult.Loaded;

            // 1. Sort files deterministically by file path
            var sortedPaths = assemblies.Keys
                .OrderBy(p => p, StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Lookups: by absolute path, and by assembly name for cross-referencing
            var pathToDllMap = new Dictionary<string, DllInfo>(StringComparer.OrdinalIgnoreCase);
            var nameToDllMap = new Dictionary<string, List<DllInfo>>(StringComparer.OrdinalIgnoreCase);

            int currentId = 1;
            foreach (var filePath in sortedPaths)
            {
                var assembly = assemblies[filePath];
                var dllInfo = CreateDllInfo(assembly, filePath, currentId++);

                graph.Dlls.Add(dllInfo);
                pathToDllMap[filePath] = dllInfo;

                var asmName = assembly.Name.Name;
                if (!nameToDllMap.TryGetValue(asmName, out var list))
                {
                    list = new List<DllInfo>();
                    nameToDllMap[asmName] = list;
                }
                list.Add(dllInfo);
            }

            // 2. Extract Types
            foreach (var item in assemblies)
            {
                if (pathToDllMap.TryGetValue(item.Key, out var dllInfo))
                {
                    _typeExtractor.ExtractTypes(item.Value, dllInfo);
                }
            }

            // 3. Build References with deduplication
            _referenceBuilder.BuildDllReferences(graph, assemblies, pathToDllMap, nameToDllMap);
            return new ScanResult
            {
                Graph = graph,
                Skipped = loadResult.Skipped,
                NativeDlls = loadResult.NativeDlls
            };
        }
        private LoadResult LoadAssemblies(
            string rootFolder)
        {
            var loaded = new ConcurrentDictionary<string, AssemblyDefinition>(StringComparer.OrdinalIgnoreCase);
            var skipped = new ConcurrentBag<SkippedAssemblyInfo>();
            var nativeDlls = new ConcurrentBag<NativeDllInfo>();
            var dllFiles = Directory.GetFiles(
                rootFolder,
                "*.dll",
                SearchOption.AllDirectories);
            Console.WriteLine($"DLLs Found: {dllFiles.Length}");
            var maxDegree = Math.Max(1, Environment.ProcessorCount - 1);
            Parallel.ForEach(dllFiles, new ParallelOptions { MaxDegreeOfParallelism = maxDegree }, file =>
            {
                try
                {
                    if (!IsDotNetAssembly(file))
                    {
                        // Extract native DLL info
                        var nativeInfo = _nativeAnalyzer.ExtractNativeDllInfo(file);
                        nativeDlls.Add(nativeInfo);
                        skipped.Add(new SkippedAssemblyInfo
                        {
                            FilePath = file,
                            Reason = "Not a .NET assembly",
                            SkipCategory = "Native",
                            NativeDllInfo = nativeInfo
                        });
                        return;
                    }
                    var assembly = AssemblyDefinition.ReadAssembly(file);
                    loaded[file] = assembly;
                }
                catch (BadImageFormatException ex)
                {
                    skipped.Add(new SkippedAssemblyInfo
                    {
                        FilePath = file,
                        Reason = ex.Message,
                        SkipCategory = "Corrupted",
                        Exception = new DllJson.Models.ExceptionInfo
                        {
                            Type = ex.GetType().FullName,
                            Message = ex.Message,
                            StackTrace = ex.StackTrace
                        }
                    });
                }
                catch (Exception ex)
                {
                    skipped.Add(new SkippedAssemblyInfo
                    {
                        FilePath = file,
                        Reason = ex.Message,
                        SkipCategory = "Exception",
                        Exception = new DllJson.Models.ExceptionInfo
                        {
                            Type = ex.GetType().FullName,
                            Message = ex.Message,
                            StackTrace = ex.StackTrace
                        }
                    });
                }
            });
            return new LoadResult
            {
                Loaded = new Dictionary<string, AssemblyDefinition>(loaded, StringComparer.OrdinalIgnoreCase),
                Skipped = new List<SkippedAssemblyInfo>(skipped),
                NativeDlls = new List<NativeDllInfo>(nativeDlls)
            };
        }
        private DllInfo CreateDllInfo(
            AssemblyDefinition assembly,
            string filePath)
        {
            var dllInfo = new DllInfo
            {
                DllName = assembly.Name.Name,
                Version = assembly.Name.Version?.ToString(),
                FilePath = filePath,
                Metadata = new Metadata
                {
                    AssemblyName = assembly.Name.Name,
                    RuntimeVersion = assembly.MainModule.RuntimeVersion,
                    ScanDate = DateTime.UtcNow
                }
            };
            foreach (var reference in assembly.MainModule.AssemblyReferences)
            {
                dllInfo.Dependencies.Add(
                    new Dependencies
                    {
                        AssemblyName = reference.Name,
                        Version = reference.Version?.ToString()
                    });
            }
            return dllInfo;
        }
        private bool IsDotNetAssembly(string file)
        {
            try
            {
                // Quick check - will throw for native or invalid PE files
                AssemblyName.GetAssemblyName(file);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
    public class LoadResult
    {
        public Dictionary<string, AssemblyDefinition> Loaded { get; set; } = new Dictionary<string, AssemblyDefinition>(StringComparer.OrdinalIgnoreCase);
        public List<SkippedAssemblyInfo> Skipped { get; set; } = new List<SkippedAssemblyInfo>();
        public List<NativeDllInfo> NativeDlls { get; set; } = new List<NativeDllInfo>();
    }
    public class SkippedAssemblyInfo
    {
        public string FilePath { get; set; }
        public string Reason { get; set; }
        public string SkipCategory { get; set; }
        public DllJson.Models.ExceptionInfo Exception { get; set; }
        public NativeDllInfo NativeDllInfo { get; set; }
    }
    public class ScanResult
    {
        public AssemblyGraph Graph { get; set; }
        public List<SkippedAssemblyInfo> Skipped { get; set; } = new List<SkippedAssemblyInfo>();
        public List<NativeDllInfo> NativeDlls { get; set; } = new List<NativeDllInfo>();
    }
}