using DllJson.Models;
using Mono.Cecil;
namespace DllJson.Services
{
    public class MemberExtractor
    {
        public void PopulateClassMembers(
            TypeDefinition type,
            Classes cls)
        {
            ExtractFields(type, cls);
            ExtractProperties(type, cls);
            ExtractMethods(type, cls);
            ExtractEvents(type, cls);
        }
        private void ExtractFields(
            TypeDefinition type,
            Classes cls)
        {
            foreach (var field in type.Fields)
            {
                if (field.IsSpecialName)
                    continue;
                cls.Fields.Add(new Fields
                {
                    Name = field.Name,
                    Type = field.FieldType.FullName,
                    IsPublic = field.IsPublic,
                    IsStatic = field.IsStatic,
                    IsReadonly = field.IsInitOnly
                });
            }
        }
        private void ExtractProperties(
            TypeDefinition type,
            Classes cls)
        {
            foreach (var property in type.Properties)
            {
                cls.Properties.Add(new Properties
                {
                    Name = property.Name,
                    Type = property.PropertyType.FullName,
                    CanRead = property.GetMethod != null,
                    CanWrite = property.SetMethod != null
                });
            }
        }
        private void ExtractMethods(
            TypeDefinition type,
            Classes cls)
        {
            foreach (var method in type.Methods)
            {
                if (method.IsGetter ||
                    method.IsSetter ||
                    method.IsAddOn ||
                    method.IsRemoveOn)
                {
                    continue;
                }
                var methodInfo = new Methods
                {
                    Name = method.Name,
                    ReturnType = method.ReturnType.FullName,
                    IsStatic = method.IsStatic,
                    IsPublic = method.IsPublic,
                    IsVirtual = method.IsVirtual,
                    IsAbstract = method.IsAbstract,
                    IsConstructor = method.IsConstructor
                };
                foreach (var parameter in method.Parameters)
                {
                    methodInfo.Parameters.Add(
                        new ParameterInfo
                        {
                            Name = parameter.Name,
                            Type = parameter.ParameterType.FullName,
                            IsOptional = parameter.IsOptional,
                            IsOut = parameter.IsOut,
                            IsRef = parameter.ParameterType.IsByReference
                        });
                }
                cls.Methods.Add(methodInfo);
            }
        }
        private void ExtractEvents(
            TypeDefinition type,
            Classes cls)
        {
            foreach (var evt in type.Events)
            {
                cls.Events.Add(new Events
                {
                    Name = evt.Name,
                    EventType = evt.EventType.FullName
                });
            }
        }
    }
}