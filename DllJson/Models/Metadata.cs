using System;
namespace DllJson.Models
{
    public class Metadata
    {
        public string AssemblyName { get; set; }
        public string Culture { get; set; }
        public string PublicKeyToken { get; set; }
        public string RuntimeVersion { get; set; }
        public DateTime ScanDate { get; set; } = DateTime.UtcNow;
    }
}