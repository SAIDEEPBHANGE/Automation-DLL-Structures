namespace DllJson.Models
{
    public class TypeReference
    {
        public string SourceDllId { get; set; }
        public string TargetDllId { get; set; }
        public string SourceDllName { get; set; }
        public string TargetDllName { get; set; }
        public string SourceType { get; set; }
        public string TargetType { get; set; }
        public string MemberName { get; set; }
        public string ReferenceKind { get; set; }
    }
}