export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const requestUrl = `${import.meta.env.BASE_URL}${url.replace(/^\/+/, "")}`;
  const res = await fetch(requestUrl, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${requestUrl}`);
  return (await res.json()) as T;
}
