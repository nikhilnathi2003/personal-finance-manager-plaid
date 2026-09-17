import { CONFIG } from '../config';

// Every backend call goes through here. Sends the shared secret when
// one is set, so only this app can reach your data on the public URL.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${CONFIG.BACKEND_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(CONFIG.API_KEY ? { 'x-api-key': CONFIG.API_KEY } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
