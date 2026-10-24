using DllJson.Models;
using Mono.Cecil;
using System.Collections.Generic;

namespace DllJson.Services
{
    public class ReferenceBuilder
    {
        public void BuildDllReferences(
            AssemblyGraph graph,
            Dictionary<string, AssemblyDefinition> assemblies,
            Dictionary<string, DllInfo> pathToDllMap,
            Dictionary<string, List<DllInfo>> nameToDllMap)
        {
            if (graph.References == null)
            {
                graph.References = new List<References>();
            }

            // Deduplication tracker: 64-bit packed numeric key
            var seenEdges = new HashSet<long>();

            foreach (var entry in assemblies)
            {
                var filePath = entry.Key;
                var assembly = entry.Value;

                if (!pathToDllMap.TryGetValue(filePath, out var sourceDll))
                {
                    continue;
                }

                if (assembly.MainModule?.AssemblyReferences == null)
                {
                    continue;
                }

                foreach (var refDef in assembly.MainModule.AssemblyReferences)
                {
                    if (!nameToDllMap.TryGetValue(refDef.Name, out var targetDllList))
                    {
                        continue; // External or GAC dependency
                    }

                    foreach (var targetDll in targetDllList)
                    {
                        if (sourceDll.Id == targetDll.Id)
                        {
                            continue; // Prevent self-referencing loops
                        }

                        // Pack two 32-bit ints into one 64-bit long for 0-allocation tracking
                        long edgeKey = ((long)sourceDll.Id << 32) | (uint)targetDll.Id;
                        if (seenEdges.Add(edgeKey))
                        {
                            graph.References.Add(new References
                            {
                                SourceDllId = sourceDll.Id,
                                TargetDllId = targetDll.Id
                            });
                        }
                    }
                }
            }
        }
    }
}