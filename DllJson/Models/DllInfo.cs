using System;
using System.Collections.Generic;
namespace DllJson.Models
{
    public class DllInfo
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string DllName { get; set; }
        public string Version { get; set; }
        public string FilePath { get; set; }
        public Metadata Metadata { get; set; } = new Metadata();
        public List<Dependencies> Dependencies { get; set; } = new List<Dependencies>();
        public List<Classes> Classes { get; set; } = new List<Classes>();
        public List<Interfaces> Interfaces { get; set; } = new List<Interfaces>();
        public List<Structs> Structs { get; set; } = new List<Structs>();
        public List<Enums> Enums { get; set; } = new List<Enums>();
        public List<Delegates> Delegates { get; set; } = new List<Delegates>();
    }
}