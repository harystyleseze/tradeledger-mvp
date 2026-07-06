import 'dotenv/config';

async function run() {
  // Get token from sandbox.nomba.com
  const tokenRes = await fetch("https://sandbox.nomba.com/v1/auth/token/issue", {
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
  const tokenData = await tokenRes.json();
  const token = tokenData.data.access_token;
  
  const urls = [
    "https://sandbox.nomba.com/v1/transfers/banks",
    "https://api.nomba.com/v1/transfers/banks"
  ];
  
  for (const url of urls) {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        accountId: process.env.NOMBA_ACCOUNT_ID,
        "Content-Type": "application/json",
      }
    });
    const body = await res.text();
    console.log(`URL: ${url} -> Status: ${res.status} Body: ${body.substring(0, 150)}`);
  }
}
run();
