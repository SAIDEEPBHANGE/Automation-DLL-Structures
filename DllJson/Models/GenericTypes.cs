using System.Collections.Generic;
namespace DllJson.Models
{
    public class GenericTypes
    {
        public string Name { get; set; }
        public List<string> GenericArguments { get; set; } = new List<string>();
    }
}