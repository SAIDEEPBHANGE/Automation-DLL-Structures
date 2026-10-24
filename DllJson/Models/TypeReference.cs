namespace DllJson.Models
{
    public class TypeReference
    {
        public int SourceTypeId { get; set; }
        public int TargetTypeId { get; set; }
        public int SourceDllId { get; set; }
        public int TargetDllId { get; set; }
        public string ReferenceKind { get; set; } // "Inheritance", "Interface", "Field", "Property", "Parameter", "ReturnType"
    }
}