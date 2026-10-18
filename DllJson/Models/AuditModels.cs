using System;
using System.Collections.Generic;
namespace DllJson.Models
{
    public class AuditRun
    {
        public Guid RunId { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public long TotalDurationMs { get; set; }
        public string TargetFramework { get; set; }
        public string Machine { get; set; }
        public int ProcessId { get; set; }
        public AuditConfig Config { get; set; }
        public AuditSummary Summary { get; set; } = new AuditSummary();
        public List<FolderAudit> Folders { get; set; } = new List<FolderAudit>();
        public DateTime GeneratedAt { get; set; }
    }
    public class AuditConfig
    {
        public string SolutionPath { get; set; }
        public string AuditFolder { get; set; }
        public List<string> IncludePatterns { get; set; }
    }
    public class AuditSummary
    {
        public int FoldersScanned { get; set; }
        public int TotalDlls { get; set; }
        public int Processed { get; set; }
        public int PartiallyProcessed { get; set; }
        public int Failed { get; set; }
        public int Skipped { get; set; }
        public int NativeFound { get; set; }
        public List<string> Warnings { get; set; } = new List<string>();
    }
    public class FolderAudit
    {
        public string FolderName { get; set; }
        public string FolderPath { get; set; }
        public int DllCount { get; set; }
        public Counts Counts { get; set; } = new Counts();
        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public long DurationMs { get; set; }
        public List<DllAudit> Dlls { get; set; } = new List<DllAudit>();
        public List<NativeDllAudit> NativeDlls { get; set; } = new List<NativeDllAudit>();
        public List<string> Warnings { get; set; } = new List<string>();
    }
    public class Counts
    {
        public int Processed { get; set; }
        public int PartiallyProcessed { get; set; }
        public int Failed { get; set; }
        public int Skipped { get; set; }
        public int Native { get; set; }
    }
    public class DllAudit
    {
        public string DllName { get; set; }
        public string DllPath { get; set; }
        public string Status { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public long DurationMs { get; set; }
        public int? ProcessedTypesCount { get; set; }
        public string Result { get; set; }
        public string Reason { get; set; }
        public ExceptionInfo Exception { get; set; }
        public long? FileSizeBytes { get; set; }
        public string FileHash { get; set; }
        public List<StepAudit> Steps { get; set; } = new List<StepAudit>();
        public List<string> Warnings { get; set; } = new List<string>();
    }
    public class NativeDllAudit
    {
        public string DllName { get; set; }
        public string DllPath { get; set; }
        public long? FileSizeBytes { get; set; }
        public DateTime? CreatedDate { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public string FileVersion { get; set; }
        public string ProductVersion { get; set; }
        public string ProductName { get; set; }
        public string CompanyName { get; set; }
        public string FileDescription { get; set; }
        public string Architecture { get; set; }
        public DateTime? TimeDateStamp { get; set; }
        public string Subsystem { get; set; }
        public string OperatingSystemVersion { get; set; }
        public string ExtractionError { get; set; }
    }
    public class StepAudit
    {
        public string Step { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public long? DurationMs { get; set; }
        public string Level { get; set; }
        public string Message { get; set; }
    }
    public class ExceptionInfo
    {
        public string Type { get; set; }
        public string Message { get; set; }
        public string StackTrace { get; set; }
    }
}
