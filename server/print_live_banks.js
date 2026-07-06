import 'dotenv/config';

async function run() {
  const tokenRes = await fetch("https://api.nomba.com/v1/auth/token/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json", accountId: process.env.NOMBA_ACCOUNT_ID },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const tokenData = await tokenRes.json();
  const res = await fetch("https://api.nomba.com/v1/transfers/banks", {
    headers: {
      "Authorization": `Bearer ${tokenData.data.access_token}`,
      accountId: process.env.NOMBA_ACCOUNT_ID,
      "Content-Type": "application/json",
    }
  });
  const data = await res.json();
  if (data.data) {
    const bank100033 = data.data.find(b => b.code === '100033' || b.code === '090328'); // Palmpay's NIP codes
    console.log("Palmpay code 100033/090328:", bank100033);
  } else {
    console.log("Error:", data);
  }
}
run();
