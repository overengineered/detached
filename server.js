const express = require("express");

console.log(`[${Date.now()}] Start ${JSON.stringify(global.config)}`);

const app = express();
const port = global.config.port || 8007;

app.use(express.text());
app.use(express.json());

app.get("/finish", (req, res) => {
  console.log(`[${Date.now()}] Exit requested`);
  res.send("Exiting");
  server.close(() => process.exit());
});

global.config.host &&
  Object.entries(global.config.host).forEach(([route, path]) => {
    const handle = require(path);
    if (typeof handle != "function") {
      throw new Error(`Cannot host ${typeof handle} on ${route}`);
    }
    app.post(`${route}`, (req, res) => {
      const data = req.body;
      console.log(`[${Date.now()}] requested ${route} ${JSON.stringify(data)}`);
      handle(data.payload).then((result) => {
        console.log(`[${Date.now()}] computed ${JSON.stringify(result)}`);
        res.json({ result });
      });
    });
  });

const server = app.listen(port, () => {
  console.log(`[${Date.now()}] Server listening on port ${port}`);
});
