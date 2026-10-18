using System.Collections.Generic;
namespace DllJson.Models
{
    public class Methods
    {
        public string Name { get; set; }
        public string ReturnType { get; set; }
        public bool IsStatic { get; set; }
        public bool IsPublic { get; set; }
        public bool IsVirtual { get; set; }
        public bool IsAbstract { get; set; }
        public bool IsConstructor { get; set; }
        public List<ParameterInfo> Parameters { get; set; } = new List<ParameterInfo>();
        public List<Attributes> Attributes { get; set; } = new List<Attributes>();
    }
}