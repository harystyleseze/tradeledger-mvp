let _token = null;
let _expiresAt = 0;

async function getToken() {
  if (_token && Date.now() < _expiresAt) return _token;

  const res = await fetch(`${process.env.NOMBA_BASE_URL}/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accountId: process.env.NOMBA_ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Nomba auth failed ${res.status}: ${body}`);
  }

  const data = await res.json();
  _token = data.data.access_token;
  _expiresAt = Date.now() + 55 * 60 * 1000;
  return _token;
}

export async function nombaRequest(method, path, body = null) {
  const token = await getToken();

  const res = await fetch(`${process.env.NOMBA_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      accountId: process.env.NOMBA_ACCOUNT_ID,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Nomba ${method} ${path} → ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json();
}
