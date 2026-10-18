using System.Collections.Generic;
namespace DllJson.Models
{
    public class Attributes
    {
        public string Name { get; set; }
        public Dictionary<string, string> Arguments { get; set; } = new Dictionary<string, string>();
    }
}