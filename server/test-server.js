import express from 'express';
const app = express();
app.use(express.json());
app.post("/test", (req, res) => {
  res.json({ body: req.body });
});
app.listen(3002, () => console.log("Test server ready"));
