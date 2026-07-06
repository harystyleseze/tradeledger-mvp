const body = {"name":"Harrison Eze","email":"ceze5265@gmail.com","phone":"08138496536","bankCode":"057","accountNumber":"61233234222"};
const { customerId: providedCustomerId, name, email, phone, bankCode, accountNumber } = body;
if (!name || !email || !phone || !bankCode || !accountNumber) {
  console.log("Missing");
} else {
  console.log("All good");
}
