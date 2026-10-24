export interface AuditIndexEntry {
  FileName: string;
  DisplayName: string;
}

export interface AuditDll {
  DllName: string;
  DllPath: string;
  Status: string;
  StartedAt?: string;
  EndedAt?: string;
  DurationMs?: number;
  ProcessedTypesCount?: number;
  Result?: string | null;
  Reason?: string | null;
  Exception?: string | null;
  FileSizeBytes?: number | null;
  FileHash?: string | null;
  Steps?: string[] | null;
  Warnings?: string[];
}

export interface AuditCounts {
  Processed: number;
  PartiallyProcessed: number;
  Failed: number;
  Skipped: number;
  Native: number;
}

export interface AuditFolder {
  FolderName: string;
  FolderPath: string;
  DllCount: number;
  Counts: AuditCounts;
  StartedAt?: string;
  EndedAt?: string;
  DurationMs?: number;
  Dlls: AuditDll[];
  NativeDlls?: AuditDll[];
  Warnings?: string[];
}

export interface AuditSummary {
  FoldersScanned: number;
  TotalDlls: number;
  Processed: number;
  PartiallyProcessed: number;
  Failed: number;
  Skipped: number;
  NativeFound: number;
  Warnings: string[];
}

export interface AuditPayload {
  RunId: string;
  StartedAt: string;
  EndedAt: string;
  TotalDurationMs: number;
  TargetFramework?: string;
  Machine?: string;
  ProcessId?: number;
  Config?: {
    SolutionPath?: string;
    AuditFolder?: string;
    IncludePatterns?: string[];
  };
  Summary: AuditSummary;
  Folders: AuditFolder[];
  GeneratedAt: string;
}

export interface AuditDllRow extends AuditDll {
  folder: string;
  isNative: boolean;
}

export type AuditSortKey = "DllName" | "Status" | "DurationMs" | "ProcessedTypesCount" | "folder";
