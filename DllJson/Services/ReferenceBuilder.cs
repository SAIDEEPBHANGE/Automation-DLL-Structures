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
            Dictionary<string, DllInfo> dllLookup)
        {
            foreach (var assemblyEntry in assemblies)
            {
                var assembly = assemblyEntry.Value;
                if (!dllLookup.TryGetValue(
                    assembly.Name.Name,
                    out var sourceDll))
                {
                    continue;
                }
                foreach (var reference in assembly.MainModule.AssemblyReferences)
                {
                    if (!dllLookup.TryGetValue(
                        reference.Name,
                        out var targetDll))
                    {
                        continue;
                    }
                    graph.References.Add(
                        new References
                        {
                            SourceDllId = sourceDll.Id,
                            TargetDllId = targetDll.Id
                        });
                }
            }
        }
    }
}