import 'dotenv/config';

async function run() {
  const tokenRes = await fetch("https://sandbox.nomba.com/v1/auth/token/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json", accountId: process.env.NOMBA_ACCOUNT_ID },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const tokenData = await tokenRes.json();
  const res = await fetch("https://sandbox.nomba.com/v1/transfers/banks", {
    headers: {
      "Authorization": `Bearer ${tokenData.data.access_token}`,
      accountId: process.env.NOMBA_ACCOUNT_ID,
      "Content-Type": "application/json",
    }
  });
  const data = await res.json();
  console.log("Total banks:", data.data.length);
  const names = data.data.map(b => b.name).sort();
  console.log(names.join(", "));
}
run();
