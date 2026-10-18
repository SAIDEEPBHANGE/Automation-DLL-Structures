using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Diagnostics;
namespace DllJson.Services
{
    public class NativeDllAnalyzer
    {
        [StructLayout(LayoutKind.Sequential)]
        private struct IMAGE_DOS_HEADER
        {
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 2)]
            public char[] e_magic;
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 58)]
            public byte[] e_res;
            public uint e_lfanew;
        }
        [StructLayout(LayoutKind.Sequential)]
        private struct IMAGE_FILE_HEADER
        {
            public ushort Machine;
            public ushort NumberOfSections;
            public uint TimeDateStamp;
            public uint PointerToSymbolTable;
            public uint NumberOfSymbols;
            public ushort SizeOfOptionalHeader;
            public ushort Characteristics;
        }
        [StructLayout(LayoutKind.Sequential)]
        private struct IMAGE_OPTIONAL_HEADER_32
        {
            public ushort Magic;
            public byte MajorLinkerVersion;
            public byte MinorLinkerVersion;
            public uint SizeOfCode;
            public uint SizeOfInitializedData;
            public uint SizeOfUninitializedData;
            public uint AddressOfEntryPoint;
            public uint BaseOfCode;
            public uint BaseOfData;
            public uint ImageBase;
            public uint SectionAlignment;
            public uint FileAlignment;
            public ushort MajorOperatingSystemVersion;
            public ushort MinorOperatingSystemVersion;
            public ushort MajorImageVersion;
            public ushort MinorImageVersion;
            public ushort MajorSubsystemVersion;
            public ushort MinorSubsystemVersion;
            public uint Win32VersionValue;
            public uint SizeOfImage;
            public uint SizeOfHeaders;
            public uint CheckSum;
            public ushort Subsystem;
            public ushort DllCharacteristics;
        }
        private enum MachineType : ushort
        {
            I386 = 0x014c,
            R3000 = 0x0162,
            R4000 = 0x0166,
            R10000 = 0x0168,
            WCEMIPSV2 = 0x0169,
            ALPHA = 0x0184,
            SH3 = 0x01a2,
            SH3DSP = 0x01a3,
            SH3E = 0x01a4,
            SH4 = 0x01a6,
            SH5 = 0x01a8,
            ARM = 0x01c0,
            THUMB = 0x01c2,
            ARMV7 = 0x01c4,
            ARM64 = 0xaa64,
            AMD64 = 0x8664,
            M32R = 0x9041,
            ARM64EC = 0xa641
        }
        private enum Subsystem : ushort
        {
            Unknown = 0,
            Native = 1,
            WindowsGUI = 2,
            WindowsCUI = 3,
            OS2CUI = 5,
            PosixCUI = 7,
            WindowsCEGUI = 9,
            EFIApplication = 10,
            EFIBootServiceDriver = 11,
            EFIRuntimeDriver = 12,
            EFIRom = 13,
            XboxApp = 14,
            XboxSystemApp = 16
        }
        public NativeDllInfo ExtractNativeDllInfo(string filePath)
        {
            var info = new NativeDllInfo
            {
                FilePath = filePath,
                FileName = Path.GetFileName(filePath)
            };
            try
            {
                // Get file info
                var fileInfo = new FileInfo(filePath);
                info.FileSizeBytes = fileInfo.Length;
                info.CreatedDate = fileInfo.CreationTimeUtc;
                info.ModifiedDate = fileInfo.LastWriteTimeUtc;
                // Get file version
                try
                {
                    var versionInfo = FileVersionInfo.GetVersionInfo(filePath);
                    info.FileVersion = versionInfo.FileVersion;
                    info.ProductVersion = versionInfo.ProductVersion;
                    info.ProductName = versionInfo.ProductName;
                    info.CompanyName = versionInfo.CompanyName;
                    info.FileDescription = versionInfo.FileDescription;
                }
                catch
                {
                    // version info not available
                }
                // Parse PE header
                try
                {
                    using (var file = File.OpenRead(filePath))
                    {
                        var dosHeader = ReadStruct<IMAGE_DOS_HEADER>(file);
                        if (dosHeader.e_magic[0] != 'M' || dosHeader.e_magic[1] != 'Z')
                        {
                            info.Architecture = "Invalid PE";
                            return info;
                        }
                        file.Seek(dosHeader.e_lfanew, SeekOrigin.Begin);
                        var signature = new byte[4];
                        file.Read(signature, 0, 4);
                        if (signature[0] != 'P' || signature[1] != 'E')
                        {
                            info.Architecture = "Unknown";
                            return info;
                        }
                        var fileHeader = ReadStruct<IMAGE_FILE_HEADER>(file);
                        info.Architecture = GetMachineType(fileHeader.Machine);
                        info.TimeDateStamp = UnixTimeStampToDateTime(fileHeader.TimeDateStamp);
                        info.Characteristics = fileHeader.Characteristics;
                        // Read optional header for subsystem info
                        var optionalHeader = ReadStruct<IMAGE_OPTIONAL_HEADER_32>(file);
                        info.Subsystem = GetSubsystemName((Subsystem)optionalHeader.Subsystem);
                        info.OperatingSystemVersion = $"{optionalHeader.MajorOperatingSystemVersion}.{optionalHeader.MinorOperatingSystemVersion}";
                    }
                }
                catch (Exception ex)
                {
                    info.PEAnalysisError = ex.Message;
                }
            }
            catch (Exception ex)
            {
                info.ExtractionError = ex.Message;
            }
            return info;
        }
        private T ReadStruct<T>(FileStream file) where T : struct
        {
            var size = Marshal.SizeOf(typeof(T));
            var buffer = new byte[size];
            file.Read(buffer, 0, size);
            var handle = GCHandle.Alloc(buffer, GCHandleType.Pinned);
            try
            {
                return (T)Marshal.PtrToStructure(handle.AddrOfPinnedObject(), typeof(T));
            }
            finally
            {
                handle.Free();
            }
        }
        private string GetMachineType(ushort machine)
        {
            switch ((MachineType)machine)
            {
                case MachineType.I386: return "x86";
                case MachineType.AMD64: return "x64";
                case MachineType.ARM: return "ARM";
                case MachineType.ARM64: return "ARM64";
                case MachineType.ARMV7: return "ARMv7";
                case MachineType.THUMB: return "THUMB";
                case MachineType.ARM64EC: return "ARM64EC";
                default: return "Unknown";
            }
        }
        private string GetSubsystemName(Subsystem subsystem)
        {
            switch (subsystem)
            {
                case Subsystem.Native: return "Native";
                case Subsystem.WindowsGUI: return "Windows GUI";
                case Subsystem.WindowsCUI: return "Windows Console";
                case Subsystem.OS2CUI: return "OS/2 Console";
                case Subsystem.PosixCUI: return "POSIX Console";
                case Subsystem.WindowsCEGUI: return "Windows CE GUI";
                case Subsystem.EFIApplication: return "EFI Application";
                case Subsystem.EFIBootServiceDriver: return "EFI Boot Service Driver";
                case Subsystem.EFIRuntimeDriver: return "EFI Runtime Driver";
                case Subsystem.EFIRom: return "EFI ROM";
                case Subsystem.XboxApp: return "Xbox App";
                case Subsystem.XboxSystemApp: return "Xbox System App";
                default: return "Unknown";
            }
        }
        private DateTime UnixTimeStampToDateTime(uint timestamp)
        {
            var dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
            dateTime = dateTime.AddSeconds(timestamp);
            return dateTime;
        }
    }
    public class NativeDllInfo
    {
        public string FilePath { get; set; }
        public string FileName { get; set; }
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
        public ushort? Characteristics { get; set; }
        public string Subsystem { get; set; }
        public string OperatingSystemVersion { get; set; }
        public string PEAnalysisError { get; set; }
        public string ExtractionError { get; set; }
    }
}
