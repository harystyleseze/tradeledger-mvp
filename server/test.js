fetch('http://localhost:3001/merchants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({"name":"Harrison Eze","email":"ceze5265@gmail.com","phone":"08138496536","bankCode":"057","accountNumber":"61233234222"})
}).then(r => r.json()).then(console.log);
