async function run() {
  const res = await fetch("https://tradeledger.onrender.com/merchants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Harrison Eze",
      email: "ceze5265@gmail.com",
      phone: "08138496536",
      bankCode: "100033",
      accountNumber: "8138496536",
      password: "password123"
    })
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
run();
