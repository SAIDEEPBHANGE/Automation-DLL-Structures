using System.Collections.Generic;
namespace DllJson.Models
{
    public class ParameterInfo
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public bool IsOptional { get; set; }
        public string DefaultValue { get; set; }
        public bool IsOut { get; set; }
        public bool IsRef { get; set; }
        public List<Attributes> Attributes { get; set; } = new List<Attributes>();
    }
}