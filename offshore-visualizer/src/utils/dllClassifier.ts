const VENDOR_PREFIXES = ["Microsoft.", "Telerik.", "CefSharp.", "Xceed."];

export type DllOrigin = "msil" | "vendor";

export const ORIGIN_LABEL: Record<DllOrigin, string> = {
  msil: "MSIL / .NET",
  vendor: "Vendor / Runtime",
};

export const ORIGIN_HEX: Record<DllOrigin, number> = {
  msil: 0x3b82f6,
  vendor: 0xea580c,
};

export const originCss = (o: DllOrigin): string => `#${ORIGIN_HEX[o].toString(16).padStart(6, "0")}`;

export function isVendorDll(name: string): boolean {
  return VENDOR_PREFIXES.some((p) => name.startsWith(p));
}

/** Single source of truth for origin: used by the table, graph colours, legend and drawer. */
export function getOrigin(name: string): DllOrigin {
  return isVendorDll(name) ? "vendor" : "msil";
}

export function getArchitectureLabel(name: string): string {
  return ORIGIN_LABEL[getOrigin(name)];
}
