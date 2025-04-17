const express = require("express");
const { stringify, parse } = require("devalue");§

console.log(`[${Date.now()}] Start ${JSON.stringify(global.config)}`);

const app = express();
const port = global.config.port || 8007;

app.use(express.text({ type: "application/devalue" }));

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
      const data = parse(req.body);
      console.log(`[${Date.now()}] requested ${route} ${stringify(data)}`);
      handle(data.payload).then((result) => {
        console.log(`[${Date.now()}] computed ${stringify(result)}`);
        res.send(stringify({ result }));
      });
    });
  });

const server = app.listen(port, () => {
  console.log(`[${Date.now()}] Server listening on port ${port}`);
});
