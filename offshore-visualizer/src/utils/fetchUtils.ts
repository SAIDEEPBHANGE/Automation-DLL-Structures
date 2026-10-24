export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}
