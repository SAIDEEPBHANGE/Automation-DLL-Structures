const VENDOR_PREFIXES = ["Microsoft.", "Telerik.", "CefSharp.", "Xceed."];

export function isVendorDll(name: string): boolean {
  return VENDOR_PREFIXES.some((p) => name.startsWith(p));
}

export function getArchitectureLabel(name: string): string {
  return isVendorDll(name) ? "Vendor / Runtime" : "MSIL / .NET";
}
