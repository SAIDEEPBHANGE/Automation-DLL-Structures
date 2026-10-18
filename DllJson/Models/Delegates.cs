using System.Collections.Generic;
namespace DllJson.Models
{
    public class Delegates
    {
        public string Name { get; set; }
        public string ReturnType { get; set; }
        public string Namespace { get; set; }
        public string FullName { get; set; }
        public string DeclaringType { get; set; }
        public List<ParameterInfo> Parameters { get; set; } = new List<ParameterInfo>();
    }
}