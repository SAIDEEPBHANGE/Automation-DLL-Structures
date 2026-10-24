using DllJson.Models;
using Mono.Cecil;
using System;
using System.Collections.Generic;
using TypeRefModel = DllJson.Models.TypeReference;

namespace DllJson.Services
{
    public class ReferenceBuilder
    {
        private static readonly HashSet<string> FrameworkPrefixes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "System",
            "Microsoft",
            "mscorlib",
            "WindowsBase",
            "PresentationCore",
            "PresentationFramework"
        };

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

            var seenEdges = new HashSet<long>();

            foreach (var entry in assemblies)
            {
                var filePath = entry.Key;
                var assembly = entry.Value;

                if (!pathToDllMap.TryGetValue(filePath, out var sourceDll))
                    continue;

                if (assembly.MainModule?.AssemblyReferences == null)
                    continue;

                foreach (var refDef in assembly.MainModule.AssemblyReferences)
                {
                    if (!nameToDllMap.TryGetValue(refDef.Name, out var targetDllList))
                        continue;

                    foreach (var targetDll in targetDllList)
                    {
                        if (sourceDll.Id == targetDll.Id)
                            continue;

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

        public void BuildTypeReferences(
            AssemblyGraph graph,
            Dictionary<string, AssemblyDefinition> assemblies,
            Dictionary<string, DllInfo> pathToDllMap)
        {
            if (graph.TypeReferences == null)
            {
                graph.TypeReferences = new List<TypeRefModel>();
            }

            // Inside ReferenceBuilder.cs -> BuildTypeReferences()

            var typeLookup = new Dictionary<string, (int TypeId, int DllId)>(StringComparer.Ordinal);
            int currentTypeId = 1;

            foreach (var dll in graph.Dlls)
            {
                // Index Classes
                if (dll.Classes != null)
                {
                    foreach (var cls in dll.Classes)
                    {
                        cls.Id = currentTypeId++;
                        typeLookup[cls.FullName] = (cls.Id, dll.Id);
                    }
                }

                // Index Interfaces
                if (dll.Interfaces != null)
                {
                    foreach (var iface in dll.Interfaces)
                    {
                        iface.Id = currentTypeId++;
                        typeLookup[iface.FullName] = (iface.Id, dll.Id);
                    }
                }

                // Index Structs
                if (dll.Structs != null)
                {
                    foreach (var str in dll.Structs)
                    {
                        str.Id = currentTypeId++;
                        typeLookup[str.FullName] = (str.Id, dll.Id);
                    }
                }
            }

            var seenTypeEdges = new HashSet<long>();

            void TryAddEdge(int sourceTypeId, int sourceDllId, string targetTypeName, string kind)
            {
                if (string.IsNullOrEmpty(targetTypeName)) return;

                targetTypeName = targetTypeName.TrimEnd('&', '*', '[', ']');

                foreach (var prefix in FrameworkPrefixes)
                {
                    if (targetTypeName.StartsWith(prefix + ".", StringComparison.OrdinalIgnoreCase) ||
                        targetTypeName.Equals(prefix, StringComparison.OrdinalIgnoreCase))
                    {
                        return;
                    }
                }

                if (!typeLookup.TryGetValue(targetTypeName, out var target))
                    return;

                if (sourceTypeId == target.TypeId)
                    return;

                long edgeKey = ((long)sourceTypeId << 32) | (uint)target.TypeId;
                if (seenTypeEdges.Add(edgeKey))
                {
                    graph.TypeReferences.Add(new TypeRefModel
                    {
                        SourceTypeId = sourceTypeId,
                        TargetTypeId = target.TypeId,
                        SourceDllId = sourceDllId,
                        TargetDllId = target.DllId,
                        ReferenceKind = kind
                    });
                }
            }

            foreach (var entry in assemblies)
            {
                if (!pathToDllMap.TryGetValue(entry.Key, out var sourceDll) || sourceDll.Classes == null)
                    continue;

                foreach (var cls in sourceDll.Classes)
                {
                    TryAddEdge(cls.Id, sourceDll.Id, cls.BaseType, "Inheritance");

                    if (cls.ImplementedInterfaces != null)
                    {
                        foreach (var ifaceName in cls.ImplementedInterfaces)
                            TryAddEdge(cls.Id, sourceDll.Id, ifaceName, "Interface");
                    }

                    if (cls.Fields != null)
                    {
                        foreach (var field in cls.Fields)
                            TryAddEdge(cls.Id, sourceDll.Id, field.Type, "Field");
                    }

                    if (cls.Properties != null)
                    {
                        foreach (var prop in cls.Properties)
                            TryAddEdge(cls.Id, sourceDll.Id, prop.Type, "Property");
                    }

                    if (cls.Methods != null)
                    {
                        foreach (var method in cls.Methods)
                        {
                            TryAddEdge(cls.Id, sourceDll.Id, method.ReturnType, "ReturnType");

                            if (method.Parameters != null)
                            {
                                foreach (var param in method.Parameters)
                                    TryAddEdge(cls.Id, sourceDll.Id, param.Type, "Parameter");
                            }
                        }
                    }
                }
            }
        }
    }
}