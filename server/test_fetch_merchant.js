import 'dotenv/config';

async function run() {
  const { authenticateToken, generateToken } = await import('./src/utils/auth.js');
  const token = generateToken("cmr39i33l0000dn5q0zznxmpd");
  
  const res = await fetch('http://localhost:10000/api/merchants/cmr39i33l0000dn5q0zznxmpd', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("Merchant fetched:");
  console.log("buyerAccounts length:", data.buyerAccounts?.length);
  if (data.buyerAccounts?.length) {
     console.log("first buyer account status:", data.buyerAccounts[0].status);
  }
}
run();
