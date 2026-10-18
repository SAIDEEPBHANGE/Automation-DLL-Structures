using DllJson.Models;
using System.Collections.Generic;
namespace DllJson.Models
{
    public class Classes
    {
        public string Name { get; set; }
        public string Namespace { get; set; }
        public string FullName { get; set; }
        public string BaseType { get; set; }
        public bool IsAbstract { get; set; }
        public bool IsSealed { get; set; }
        public string DeclaringType { get; set; }
        public List<string> ImplementedInterfaces { get; set; } = new List<string>();
        public List<Fields> Fields { get; set; } = new List<Fields>();
        public List<Methods> Methods { get; set; } = new List<Methods>();
        public List<Properties> Properties { get; set; } = new List<Properties>();
        public List<Events> Events { get; set; } = new List<Events>();
        public List<Attributes> Attributes { get; set; } = new List<Attributes>();
    }
}