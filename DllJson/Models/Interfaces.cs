using System.Collections.Generic;
namespace DllJson.Models
{
    public class Interfaces
    {
        public string Name { get; set; }
        public string Namespace { get; set; }
        public string FullName { get; set; }
        public string DeclaringType { get; set; }
        public List<Methods> Methods { get; set; } = new List<Methods>();
        public List<Properties> Properties { get; set; } = new List<Properties>();
        public List<string> ImplementedInterfaces { get; set; } = new List<string>();
    }
}