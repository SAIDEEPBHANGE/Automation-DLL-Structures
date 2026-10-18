using System.Collections.Generic;
namespace DllJson.Models
{
    public class AssemblyGraph
    {
        public List<DllInfo> Dlls { get; set; } = new List<DllInfo>();
        public List<References> References { get; set; } = new List<References>();
        public List<TypeReference> TypeReferences { get; set; } = new List<TypeReference>();
    }
}