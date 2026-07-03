import { nombaRequest } from "./auth.js";

export function toNombaDate(d) {
  return d.toISOString().split("T")[0];
}

export function subDays(d, n) {
  return new Date(d.getTime() - n * 24 * 60 * 60 * 1000);
}

// Nomba returns amount as a string and status in UPPERCASE ("SUCCESS").
// Normalize here at the integration boundary so the scoring engine always
// sees numeric amounts and lowercase status values. Records with unparseable
// amounts (the sandbox contains literal "undefined") are dropped.
function normalize(t) {
  const amount = Number(t.amount);
  if (!Number.isFinite(amount)) return null;
  return {
    ...t,
    amount,
    status: String(t.status ?? "").toLowerCase(),
  };
}

export async function fetchTransactions(dateFrom, dateTo) {
  // GET /transactions/accounts — cursor-paginated. The endpoint ignores
  // dateFrom/dateTo query params, so the date range is filtered client-side
  // on timeCreated.
  const all = [];
  let cursor = null;

  while (true) {
    const qs = new URLSearchParams({ limit: "200" });
    if (cursor) qs.set("cursor", cursor);
    const res = await nombaRequest("GET", `/transactions/accounts?${qs.toString()}`);
    const batch = res.data?.results ?? [];
    all.push(...batch);
    cursor = res.data?.cursor ?? null;
    if (!cursor || batch.length === 0) break;
  }

  const from = new Date(`${dateFrom}T00:00:00Z`);
  const to = new Date(`${dateTo}T23:59:59Z`);

  return all
    .filter((t) => {
      const created = new Date(t.timeCreated);
      return created >= from && created <= to;
    })
    .map(normalize)
    .filter(Boolean);
}

export async function getMerchantHistory() {
  const dateTo = toNombaDate(new Date());
  const dateFrom = toNombaDate(subDays(new Date(), 90));
  return fetchTransactions(dateFrom, dateTo);
}
