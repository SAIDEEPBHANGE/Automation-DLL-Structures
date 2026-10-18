using System.Collections.Generic;
namespace DllJson.Models
{
    public class Fields
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public bool IsPublic { get; set; }
        public bool IsStatic { get; set; }
        public bool IsReadonly { get; set; }
        public List<Attributes> Attributes { get; set; } = new List<Attributes>();
    }
}