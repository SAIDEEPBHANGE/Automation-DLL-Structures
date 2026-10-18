namespace DllJson.Models
{
    public class Dependencies
    {
        public string AssemblyName { get; set; }
        public string Version { get; set; }
        public bool IsLocalDll { get; set; }
        public string ReferencedJsonFile { get; set; }
    }
}