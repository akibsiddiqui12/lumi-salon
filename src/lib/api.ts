export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any; query?: Record<string, string | number | boolean | undefined | null> } = {}
): Promise<T> {
  let url = path;
  if (options.query) {
    const params = new URLSearchParams();
    Object.entries(options.query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const s = params.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && (data as any).error) || `Request failed (${res.status})`);
  return data as T;
}
type Q = Record<string, string | number | boolean | undefined | null>;
export const get = <T = any>(path: string, query?: Q) => api<T>(path, { query });
export const post = <T = any>(path: string, body?: any) => api<T>(path, { method: 'POST', body });
export const put = <T = any>(path: string, body?: any) => api<T>(path, { method: 'PUT', body });
export const del = <T = any>(path: string, body?: any) => api<T>(path, { method: 'DELETE', body });
