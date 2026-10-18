using DllJson.Models;
using Mono.Cecil;
using System.Linq;
namespace DllJson.Services
{
    public class TypeExtractor
    {
        private readonly MemberExtractor _memberExtractor;
        public TypeExtractor()
        {
            _memberExtractor = new MemberExtractor();
        }
        public void ExtractTypes(
            AssemblyDefinition assembly,
            DllInfo dllInfo)
        {
            foreach (var type in assembly.MainModule.Types)
            {
                ProcessType(type, dllInfo, null);
            }
        }
        private void ProcessType(
            TypeDefinition type,
            DllInfo dllInfo,
            string declaringType)
        {
            if (type.Name.StartsWith("<"))
                return;
            //
            // Interface
            //
            if (type.IsInterface)
            {
                var iface = new Interfaces
                {
                    Name = type.Name,
                    Namespace = type.Namespace,
                    FullName = type.FullName,
                    DeclaringType = declaringType
                };
                foreach (var parent in type.Interfaces)
                {
                    iface.ImplementedInterfaces.Add(
                        parent.InterfaceType.FullName);
                }
                dllInfo.Interfaces.Add(iface);
            }
            //
            // Enum
            //
            else if (type.IsEnum)
            {
                var enumInfo = new Enums
                {
                    Name = type.Name,
                    Namespace = type.Namespace,
                    FullName = type.FullName,
                    DeclaringType = declaringType
                };
                foreach (var field in type.Fields)
                {
                    if (!field.IsSpecialName)
                    {
                        enumInfo.Values.Add(field.Name);
                    }
                }
                dllInfo.Enums.Add(enumInfo);
            }
            //
            // Delegate
            //
            else if (IsDelegate(type))
            {
                var delegateInfo = new Delegates
                {
                    Name = type.Name,
                    Namespace = type.Namespace,
                    FullName = type.FullName,
                    DeclaringType = declaringType
                };
                var invokeMethod = type.Methods.FirstOrDefault(
                    m => m.Name == "Invoke");
                if (invokeMethod != null)
                {
                    delegateInfo.ReturnType =
                        invokeMethod.ReturnType.FullName;
                    foreach (var parameter in invokeMethod.Parameters)
                    {
                        delegateInfo.Parameters.Add(
                            new ParameterInfo
                            {
                                Name = parameter.Name,
                                Type = parameter.ParameterType.FullName,
                                IsOptional = parameter.IsOptional,
                                IsOut = parameter.IsOut,
                                IsRef = parameter.ParameterType.IsByReference
                            });
                    }
                }
                dllInfo.Delegates.Add(delegateInfo);
            }
            //
            // Struct
            //
            else if (type.IsValueType)
            {
                var structInfo = new Structs
                {
                    Name = type.Name,
                    Namespace = type.Namespace,
                    FullName = type.FullName,
                    DeclaringType = declaringType
                };
                dllInfo.Structs.Add(structInfo);
            }
            //
            // Class
            //
            else if (type.IsClass)
            {
                var cls = new Classes
                {
                    Name = type.Name,
                    Namespace = type.Namespace,
                    FullName = type.FullName,
                    DeclaringType = declaringType,
                    BaseType = type.BaseType?.FullName,
                    IsAbstract = type.IsAbstract,
                    IsSealed = type.IsSealed
                };
                foreach (var iface in type.Interfaces)
                {
                    cls.ImplementedInterfaces.Add(
                        iface.InterfaceType.FullName);
                }
                _memberExtractor.PopulateClassMembers(
                    type,
                    cls);
                dllInfo.Classes.Add(cls);
            }
            //
            // Nested Types
            //
            foreach (var nested in type.NestedTypes)
            {
                ProcessType(
                    nested,
                    dllInfo,
                    type.FullName);
            }
        }
        private bool IsDelegate(TypeDefinition type)
        {
            return type.BaseType != null &&
                   type.BaseType.FullName ==
                   "System.MulticastDelegate";
        }
    }
}