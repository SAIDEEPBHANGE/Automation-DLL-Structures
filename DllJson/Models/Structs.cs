using System.Collections.Generic;
namespace DllJson.Models
{
    public class Structs
    {
        public string Name { get; set; }
        public string Namespace { get; set; }
        public string FullName { get; set; }
        public string DeclaringType { get; set; }
        public List<Properties> Properties { get; set; } = new List<Properties>();
    }
}